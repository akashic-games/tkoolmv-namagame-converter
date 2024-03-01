// tkoolmv-namagame-converter リポジトリの Github Releases に生成物をアップロードするスクリプト
// このスクリプトを実行するために実行環境では以下を満たしている必要があります
// - Github CLI をインストール済みであること
// 
// このスクリプトでは Github CLI を利用するので、環境変数 GITHUB_CLI_TOKEN に Github トークンを設定する必要がある
const fs = require("fs");
const os = require("os");
const path = require("path");
const sh = require("shelljs");

const distDirPath = path.resolve(__dirname, "..", "dist");
const packageJson = require(path.resolve(__dirname, "..", "package.json"));

const version = packageJson["version"];
const name = packageJson["name"];
const targetFilePaths = [`${name} Setup ${version}.exe`, `${name} Setup ${version}.exe.blockmap`, "latest.yml"].map(name => {
	const filePath = path.join(distDirPath, name);
	if (!fs.existsSync(filePath)) {
		console.error(`Not Found: ${filePath}`);
		process.exit(1);
	}
	return `"${filePath}"`;
});

// Releases に書き込む内容をCHANGELOGから抽出
const changelog = fs.readFileSync(path.resolve(__dirname, "..", "CHANGELOG.md")).toString();
const matches = changelog.match(new RegExp(`## ${version}(.*?)(?=## \\d|\\Z)`, 'gs'));
const tmpChangelogPath = path.join(os.tmpdir(), `changelog-${Date.now()}.md`);
// 内容に改行を含む場合、オプションで直接文章を渡すと Releases に全て書き込めないことがあるので、ファイルにしておく
fs.writeFileSync(tmpChangelogPath, matches[0].replace(`## ${version}`, '').trim());

sh.exec(`echo ${process.env.GITHUB_CLI_TOKEN} | gh auth login --with-token -h github.com`);
sh.exec(`gh release create "v${version}" -t "Release v${version}" --target "main" -F "${tmpChangelogPath}"`);
sh.exec(`gh release upload "v${version}" ${targetFilePaths.join(" ")}`);
