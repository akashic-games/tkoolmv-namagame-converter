// ffmpeg.wasm 関連のファイルを ビルド後の renderer ディレクトリにコピーする
// parcel でバンドルした場合これらのファイルはリネームされて参照できなくなるので、このような処理を行っている
const sh = require("shelljs");
const path = require("path");

const ffmpegCoreSrc = path.join(__dirname, "..", "module", "namagame-converter-ffmpeg.wasm", "packages", "core", "dist", "umd", "*");
const ffmpeg814 = path.join(__dirname, "..", "node_modules", "@ffmpeg", "ffmpeg", "dist", "umd", "814.ffmpeg.js");
const baseDir = path.join(__dirname, "..", "lib", "ffmpeg");
const ffmpegCoreDst = path.join(baseDir, "ffmpeg-core");

sh.rm("-rf", baseDir);
sh.mkdir("-p", ffmpegCoreDst);
sh.cp("-R", ffmpegCoreSrc, ffmpegCoreDst);
sh.cp(ffmpeg814, baseDir);
