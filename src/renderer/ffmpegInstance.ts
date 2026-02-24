// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention */
declare const FFmpegWASM: any;

// 1回のFFmpegインスタンスで処理できるファイル数に制限があるため、分割して処理する
let useCount = 0;
let ffmpeg = new FFmpegWASM.FFmpeg();

async function withFfmpegInstance<T>(func: (ffmpeg: any) => Promise<T>): Promise<T> {
    if (useCount === 0) {
        await ffmpeg.load({
            coreURL: "./ffmpeg-core/ffmpeg-core.js"
        });
    }
    try {
        return await func(ffmpeg);
    } finally {
        useCount = (useCount + 1) % 15;
        if (useCount === 0) {
            ffmpeg.terminate();
        }
    }
}