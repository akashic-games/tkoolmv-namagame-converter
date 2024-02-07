const sh = require("shelljs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@akashic", "tkoolmv-namagame-kit", "dist", "tkoolmv-namagame-kit", "*");
const dst = path.join(__dirname, "..", "lib", "runtime");

sh.rm("-rf", dst);
sh.mkdir("-p", dst);
sh.cp("-R", src, dst);
// electron-builderによってnode_modulesディレクトリが削除されるためリネームが必要
// TODO: リネーム処理を不要にする
sh.mv(path.join(dst, "game", "node_modules"), path.join(dst, "game", "__node_modules"));
