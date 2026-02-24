type FFMessageOptions = {
  signal?: AbortSignal;
};

interface FFMessageLoadConfig {
  coreURL?: string;
  wasmURL?: string;
  workerURL?: string;
  classWorkerURL?: string;
}

interface FFmpegInstance {
    load(config?: FFMessageLoadConfig, __namedParameters?: FFMessageOptions): Promise<boolean>;
    readFile(path: string, encoding?: string, __namedParameters?: FFMessageOptions): Promise<Uint8Array>;
    writeFile(path: string, data: Uint8Array, __namedParameters?: FFMessageOptions): Promise<boolean>;
    exec(args: string[], timeout?: number, __namedParameters?: FFMessageOptions): Promise<number>;
    terminate(): void;
}

// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars */
declare const FFmpegWASM: any;

// 1回のFFmpegインスタンスで処理できるファイル数に制限があるため、分割して処理する
let useCount = 0;
const ffmpeg: FFmpegInstance = new FFmpegWASM.FFmpeg();

async function withFFmpegInstance<T>(func: (ffmpeg: FFmpegInstance) => Promise<T>): Promise<T> {
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