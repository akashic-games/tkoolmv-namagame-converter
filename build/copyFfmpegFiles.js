// ffmpeg.wasm 関連のファイルを ビルド後の renderer ディレクトリにコピーする
// parcel でバンドルした場合これらのファイルはリネームされて参照できなくなるので、このような処理を行っている
const sh = require("shelljs");
const path = require("path");

const ffmpegCoreSrc = path.join(__dirname, "..", "module", "namagame-converter-ffmpeg.wasm", "packages", "core", "dist", "umd", "*");
const ffmpeg814 = path.join(__dirname, "..", "node_modules", "@ffmpeg", "ffmpeg", "dist", "umd", "814.ffmpeg.js");
const rendererDir = path.join(__dirname, "..", "lib", "renderer");
const ffmpegCoreDst = path.join(rendererDir, "ffmpeg-core");

sh.rm("-rf", ffmpegCoreDst);
sh.rm("-rf", path.join(rendererDir, "814.ffmpeg.js"));

sh.mkdir("-p", ffmpegCoreDst);
sh.cp("-R", ffmpegCoreSrc, ffmpegCoreDst);
sh.cp(ffmpeg814, rendererDir);
