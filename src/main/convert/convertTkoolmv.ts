import * as fs from "fs";
import * as path from "path";
import { imageSize } from "image-size";
import * as musicMetaData from "music-metadata";
import * as sharp from "sharp";
import * as shell from "shelljs";
import { mp4Inspector } from "thumbcoil";
import { convertPlugins } from "./convertPlugins";
import type { TkoolmvPlugin } from "./TkoolmvPlugin";

export async function getAssetsSize(gameSrcDirPath: string): Promise<number> {
	validateGameSrcDir(gameSrcDirPath);
	let audioDirSize = 0;
	if (fs.existsSync(path.join(gameSrcDirPath, "www/audio"))) {
		audioDirSize = await getDirectorySize(path.join(gameSrcDirPath, "www/audio"));
	}
	const imgDirSize = await getDirectorySize(path.join(gameSrcDirPath, "www/img"));
	return audioDirSize + imgDirSize;
}

async function getDirectorySize(dirPath: string): Promise<number> {
	let total = 0;
	await runInDirectory(dirPath, async filePath => {
		const stat = fs.statSync(filePath);
		total += stat.size;
	});
	return total;
}

async function runInDirectory(dirPath: string, run: (filePath: string) => Promise<void>): Promise<void> {
	const filePaths = fs.readdirSync(dirPath);
	while (filePaths.length > 0) {
		const filePath = filePaths.shift();
		const fullPath = path.join(dirPath, filePath);
		if (fs.statSync(fullPath).isDirectory()) {
			fs.readdirSync(fullPath).forEach(name => {
				filePaths.push(`${filePath}/${name}`);
			});
		} else {
			await run(fullPath);
		}
	}
}

const SUPPORTED_PLUGIN_NAMES = ["AkashicRankingMode", "Community_Basic", "PictureCallCommon", "DTextPicture"];
export async function convertTkoolmv(
	gameBaseDirPath: string,
	gameSrcDirPath: string,
	tkoolmvKitDirPath: string,
	usePluginConverter: boolean
): Promise<string> {
	if (!fs.existsSync(gameBaseDirPath)) {
		throw new Error(`Not found base directory: ${gameBaseDirPath}`);
	}
	validateGameSrcDir(gameSrcDirPath);
	const gameDistDirPath = fs.mkdtempSync(path.join(gameBaseDirPath, "namagame"));
	copyGameElements(gameSrcDirPath, gameDistDirPath, tkoolmvKitDirPath);
	let plugins: TkoolmvPlugin[] = extractPlugins(path.join(gameSrcDirPath, "www/js/plugins.js"));
	if (usePluginConverter) {
		convertPlugins(plugins, path.join(gameSrcDirPath, "www/js/plugins"), path.join(gameDistDirPath, "script/tkool/plugins"));
	} else {
		// プラグインを変換しない場合、非サポートプラグインは動作しないので除外する
		plugins = plugins.filter(p => SUPPORTED_PLUGIN_NAMES.includes(p.name));
	}
	fs.writeFileSync(path.join(gameDistDirPath, "text/Plugins.json"), JSON.stringify(plugins, null, 2));
	await modifyGameJson(path.join(gameDistDirPath, "game.json"), plugins);
	await compressImageAssets(gameSrcDirPath, gameDistDirPath);
	return gameDistDirPath;
}

function validateGameSrcDir(dirPath: string): void {
	// RPGツクールのデプロイ機能でプラットフォームとして「ウェブブラウザ」を選択すると直下にwwwディレクトリが出力されている
	const baseDirPath = path.join(dirPath, "www");
	if (!fs.existsSync(baseDirPath)) {
		throw new Error(`Not found www directory: ${baseDirPath}`);
	}
	// 変換時に参照されるファイル・ディレクトリがwww下にあるか確認
	const notExists = ["img", "data", "js/plugins.js", "js/plugins"].filter(p => !fs.existsSync(path.join(baseDirPath, p)));
	if (notExists.length > 0) {
		throw new Error(`Not found asset files: ${notExists.join(", ")}`);
	}
}

function copyGameElements(gameSrcDirPath: string, gameDistDirPath: string, tkoolmvKitDirPath: string): void {
	shell.mkdir(path.join(gameDistDirPath, "assets"));
	shell.mkdir(path.join(gameDistDirPath, "text"));
	shell.mkdir(path.join(gameDistDirPath, "script"));
	if (fs.existsSync(path.join(gameSrcDirPath, "www/audio"))) {
		shell.cp("-Rf", path.join(gameSrcDirPath, "www/audio"), path.join(gameDistDirPath, "assets"));
	} else {
		fs.mkdirSync(path.join(gameDistDirPath, "assets", "audio"), { recursive: true });
	}
	shell.cp("-Rf", path.join(gameSrcDirPath, "www/img"), path.join(gameDistDirPath, "assets"));
	shell.cp("-Rf", path.join(gameSrcDirPath, "www/data/*"), path.join(gameDistDirPath, "text"));
	shell.cp("-Rf", path.join(tkoolmvKitDirPath, "game/script/*"), path.join(gameDistDirPath, "script"));
	shell.cp("-Rf", path.join(tkoolmvKitDirPath, "game/text/*"), path.join(gameDistDirPath, "text"));
	shell.cp(path.join(tkoolmvKitDirPath, "game/game.json"), gameDistDirPath);
}

function extractPlugins(pluginsJsPath: string): TkoolmvPlugin[] {
	const pluginsJsStr = fs
		.readFileSync(pluginsJsPath)
		.toString()
		.replace(/\/\/.+\n/g, "")
		.replace("var $plugins =", "")
		.replace("];", "]")
		.trim();
	return JSON.parse(pluginsJsStr);
}

async function modifyGameJson(gameJsonPath: string, plugins: TkoolmvPlugin[]): Promise<void> {
	// 設定ファイルの動的読み込みのため、require の lint エラーを抑止
	/* eslint-disable @typescript-eslint/no-var-requires */
	const gameJson: any = require(gameJsonPath);
	const baseDirPath = path.dirname(gameJsonPath);
	const audioDirPath = path.join(baseDirPath, "assets", "audio");
	const imgDirPath = path.join(baseDirPath, "assets", "img");
	const textDirPath = path.join(baseDirPath, "text");
	const pluginScriptDirPath = path.join(baseDirPath, "script", "tkool", "plugins");
	const assets = gameJson.assets;
	const durationMap: { [path: string]: { ext: string; duration: number } } = {};
	const extMap: { [key: string]: Set<string> } = {};
	await runInDirectory(audioDirPath, async filePath => {
		if (!isSupportedAudioType(filePath)) {
			return;
		}
		const extname = path.extname(filePath);
		const assetPath = path.relative(baseDirPath, filePath).replace(extname, "").replace(/\\/g, "/");
		if (!extMap[assetPath]) {
			extMap[assetPath] = new Set<string>();
		}
		extMap[assetPath].add(extname);
		const extensions = Array.from(extMap[assetPath]);
		if (assets[assetPath]) {
			const asset = assets[assetPath];
			asset.hint = { extensions };
			if (durationMap[assetPath].ext !== ".ogg") {
				let duration = await getAudioDurationInSeconds(filePath);
				duration = Math.round(duration * 1000);
				// 現在の拡張子が ogg の場合あるいは duration が大きい場合は duration を更新する
				if (extname === ".ogg" || asset.duration < duration) {
					asset.duration = duration;
					durationMap[assetPath] = { ext: extname, duration };
				}
			}
		} else {
			let duration = await getAudioDurationInSeconds(filePath);
			duration = Math.round(duration * 1000);
			assets[assetPath] = {
				type: "audio",
				path: assetPath,
				duration: duration,
				systemId: /\/(?:se|me)\//.test(assetPath) ? "sound" : "music",
				global: true,
				hint: { extensions }
			};
			durationMap[assetPath] = { ext: extname, duration };
		}
	});
	await runInDirectory(imgDirPath, async filePath => {
		if (path.extname(filePath) === ".png") {
			const relativePath = path.relative(baseDirPath, filePath).replace(/\\/g, "/");
			const size = imageSize(filePath);
			assets[relativePath] = {
				type: "image",
				path: relativePath,
				width: size.width,
				height: size.height,
				hint: {
					untainted: true
				}
			};
		}
	});
	await runInDirectory(textDirPath, async filePath => {
		if (path.extname(filePath) === ".json") {
			// キット側でテキストアセットをアセットパスではなくアセット名で取得しているため、 アセット名を basename 拡張子抜きとする
			// TODO: キット側でアセットパスから検索できるようにして、ここのアセット名も game.json からの相対パスにすべき
			assets[path.basename(filePath).replace(".json", "")] = {
				type: "text",
				path: path.relative(baseDirPath, filePath).replace(/\\/g, "/"),
				global: true
			};
		}
	});
	// プラグインスクリプトは動的に追加される可能性がある
	await runInDirectory(pluginScriptDirPath, async filePath => {
		const name = path.basename(filePath).replace(".js", "");
		if (path.extname(filePath) === ".js" && !assets[name]) {
			assets[name] = {
				type: "script",
				path: path.relative(baseDirPath, filePath).replace(/\\/g, "/"),
				global: true
			};
		}
	});
	if (!gameJson.environment) {
		gameJson.environment = {};
	}
	if (!gameJson.environment.nicolive) {
		gameJson.environment.nicolive = {};
	}
	if (!gameJson.environment.nicolive.preferredSessionParameters) {
		gameJson.environment.nicolive.preferredSessionParameters = {};
	}
	gameJson.environment.external = {
		send: "0"
	};
	gameJson.environment["akashic-runtime"] = {
		version: "~3.7.19-0",
		flavor: "-canvas"
	};
	plugins.forEach(p => {
		switch (p.name) {
			case "AkashicRankingMode":
				const akashicRankingMode = p.parameters;
				gameJson.environment.nicolive.preferredSessionParameters.totalTimeLimit = Number(akashicRankingMode.totalTimeLimit) ?? 75;
				break;
			case "Community_Basic":
				const communityBasic = p.parameters;
				gameJson.width = Number(communityBasic.screenWidth) ?? gameJson.width;
				gameJson.height = Number(communityBasic.screenHeight) ?? gameJson.height;
				break;
		}
	});
	// game.jsonに100KB制限があるため、あえて改行やインデントを削除
	// TODO: この対応でも100kBを超える可能性はあるので、ライブラリ等使用してちゃんとminifyすべき
	fs.writeFileSync(gameJsonPath, JSON.stringify(gameJson));
}

const supportedAudioTypes = [".ogg", ".m4a"];

function isSupportedAudioType(filepath: string): boolean {
	return supportedAudioTypes.includes(path.extname(filepath));
}

async function getAudioDurationInSeconds(filepath: string): Promise<number> {
	const ext = path.extname(filepath);
	if (ext === ".ogg") {
		const metaData = await musicMetaData.parseFile(filepath, { duration: true });
		return metaData.format.duration;
	} else if (ext === ".m4a") {
		const data = fs.readFileSync(filepath);
		const moov = mp4Inspector.inspect(data).filter((o: any) => o.type === "moov")[0]; // 必須BOXなので必ず1つある
		const mvhd = moov.boxes.filter((o: any) => o.type === "mvhd")[0]; // MoVie HeaDer。moov直下の必須フィールドなので必ず1つある
		return mvhd.duration / mvhd.timescale;
	} else {
		throw new Error("Unsupported format: " + ext);
	}
}

async function compressImageAssets(gameSrcDirPath: string, gameDistDirPath: string): Promise<void> {
	try {
		const imgDirNames = fs.readdirSync(path.join(gameSrcDirPath, "www/img"));
		for (const dirName of imgDirNames) {
			const fileNames = fs.readdirSync(path.join(gameSrcDirPath, "www/img", dirName));
			for (const name of fileNames) {
				if (path.extname(name) !== ".png") {
					continue;
				}
				await sharp(path.join(gameSrcDirPath, "www/img", dirName, name))
					.png({
						compressionLevel: 9,
						quality: 50
					})
					.toFile(path.join(gameDistDirPath, "assets/img", dirName, name));
			}
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

interface AudioDataParameter {
	name: string;
	url: string;
	path: string;
	size: number;
}

export function getAudioData(gameSrcDirPath: string, baseUrl: string, audioBaseDir: string): AudioDataParameter[] {
	validateGameSrcDir(gameSrcDirPath);
	if (!fs.existsSync(path.join(gameSrcDirPath, "www/audio"))) {
		return [];
	}
	const audioData: AudioDataParameter[] = [];
	const audioDirNames = fs.readdirSync(path.join(gameSrcDirPath, "www/audio"));
	for (const dirName of audioDirNames) {
		const fileNames = fs.readdirSync(path.join(gameSrcDirPath, "www/audio", dirName));
		for (const name of fileNames) {
			// 非サポート形式のファイルは含めない
			if (!isSupportedAudioType(name)) {
				continue;
			}
			const filePath = path.join(gameSrcDirPath, "www/audio", dirName, name);
			shell.cp("-Rf", filePath, path.join(audioBaseDir, `${dirName}_${name}`));
			audioData.push({
				name: name,
				url: `${baseUrl}/${dirName}_${name}`,
				path: `${dirName}/${name}`,
				size: fs.statSync(filePath).size
			});
		}
	}
	return audioData;
}

export function setAudioBinary(audioDistPath: string, binary: Uint8Array): void {
	if (!(binary instanceof Uint8Array)) {
		throw new Error("binary is not Uint8Array");
	}
	const ext = path.extname(audioDistPath);
	switch (ext) {
		case ".ogg":
			const oggHeader = [79, 103, 103, 83]; // "OggS"のASCIIコード
			// binaryの冒頭が"OggS"になっていることを確認
			if (binary.length < oggHeader.length || binary.subarray(0, 4).some((num, i) => num !== oggHeader[i])) {
				throw new Error("binary is not ogg");
			}
			break;
		case ".m4a":
			const m4aHeader = [102, 116, 121, 112, 77, 52, 65]; // "ftypM4A"のASCIIコード
			// m4aの冒頭は000x(x:自然数)となっているので、5文字目から検証
			const binaryTarget = binary.subarray(4, 11);
			// binaryの冒頭5文字目以降が"ftypM4A"になっていることを確認
			if (binaryTarget.length !== m4aHeader.length || binaryTarget.some((num, i) => num !== m4aHeader[i])) {
				throw new Error("binary is not m4a");
			}
			break;
		default:
			throw new Error(`${ext} is not supported.`);
	}
	fs.writeFileSync(audioDistPath, binary);
}
