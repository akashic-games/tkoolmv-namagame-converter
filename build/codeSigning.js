// 生成物(tkoolmv-namagame-converter Setup ${version}.exe)にコード署名するためのスクリプト
// このスクリプトを実行するために実行環境では以下を満たしている必要があります
// - windows環境であること
// - signtool.exeをインストールしていること
// - コード署名が可能な環境であること
const sh = require("shelljs");
const path = require("path");
const fs = require("fs");

const distDirPath = path.resolve(__dirname, "..", "dist");
const packageJson = require(path.resolve(__dirname, "..", "package.json"));

const version = packageJson["version"];
const name = packageJson["name"];
const targetFilePath = path.join(distDirPath, `${name} Setup ${version}.exe`);
if (!fs.existsSync(targetFilePath)) {
	console.error(`Not Found: ${targetFilePath}`);
	process.exit(1);
}

sh.exec(`signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a "${targetFilePath}"`);
