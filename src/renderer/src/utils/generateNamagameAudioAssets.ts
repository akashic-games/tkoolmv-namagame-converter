// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention */
declare const FFmpegUtil: any
declare const FFmpegWASM: any

interface AudioDataParameter {
  name: string
  url: string
  path: string
  size: number
}

// 対象ディレクトリ中の全音声ファイルを圧縮する
// 本来はメインプロセス側で行うべき処理だが、ffmpeg.wasmがNode.jsに対応していないためレンダラー側で行う
export async function generateNamagameAudioAssets(
  gameSrcDirPath: string,
  gameDistDirPath: string,
  ffmpegBaseUrl: string
): Promise<void> {
  try {
    const audioData: AudioDataParameter[] = await (window as any).tkoolmvApi.getAudioData(
      gameSrcDirPath
    )
    const ffmpeg = new FFmpegWASM.FFmpeg()
    // 1回のFFmpegインスタンスで処理できるファイル数に制限があるため、分割して処理する
    const unit = 15
    for (let i = 0; i * unit < audioData.length; i++) {
      await ffmpeg.load({
        coreURL: await FFmpegUtil.toBlobURL(
          `${ffmpegBaseUrl}/ffmpeg-core/ffmpeg-core.js`,
          'text/javascript'
        ),
        wasmURL: await FFmpegUtil.toBlobURL(
          `${ffmpegBaseUrl}/ffmpeg-core/ffmpeg-core.wasm`,
          'application/wasm'
        )
      })
      for (let j = 0; j < unit && i * unit + j < audioData.length; j++) {
        const asset = audioData[i * unit + j]
        const prefix = 'ffmpeg_audio_'
        const data = await (await fetch(asset.url)).arrayBuffer()
        await ffmpeg.writeFile(asset.name, new Uint8Array(data))
        await ffmpeg.exec([
          '-i',
          asset.name,
          '-ab',
          '24k',
          '-ar',
          '22050',
          '-ac',
          '1',
          prefix + asset.name
        ])
        const audioBinary: Uint8Array = await ffmpeg.readFile(prefix + asset.name)
        if (asset.size <= audioBinary.byteLength) {
          throw new Error(
            `can not compress audio, before:${asset.size}, after:${audioBinary.byteLength}`
          )
        }
        await (window as any).tkoolmvApi.setAudioBinary(gameDistDirPath, asset.path, audioBinary)
      }
      await ffmpeg.terminate()
    }
  } catch (err) {
    console.trace(err)
    throw err
  }
}
