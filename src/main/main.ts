import * as admZip from "adm-zip";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { MenuItemConstructorOptions } from "electron";
import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from "electron";
import * as log from "electron-log";
import { autoUpdater } from "electron-updater";
import * as sh from "shelljs";
import { getAssetsSize, convertTkoolmv, getAudioData, setAudioBinary } from "./convert/convertTkoolmv";
import type { PlaygroundServer } from "./playground/createServer";
import { createPlaygroundServer, getGameContentUrl } from "./playground/createServer";
import { createZip } from "./util/createZip";
import { updateTkoolmvNamagameKitRuntime } from "./util/updateTkoolmvNamagameKitRuntime";

async function createWindow(): Promise<void> {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.resolve(__dirname, "preload.js"),
			nodeIntegration: true
		}
	});
	// and load the index.html of the app.
	await mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));
	// リンクをクリックすると標準のWebブラウザで開くように
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:/.test(url)) {
			// 他の処理に影響を与えず、awaitは必要ない処理なので、lint エラーを抑止
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			shell.openExternal(url);
		}
		return { action: "deny" };
	});
}

const cacheDirPath: string = path.join(os.tmpdir(), ".converter-cache");
const runtimeDirPath: string = path.join(cacheDirPath, "tkoolmv-namagame-runtime-v2");
const unzipDirPath =  fs.mkdtempSync(path.join(os.tmpdir(), "converter-runteime"));
async function updateModule(): Promise<void> {
	try {
		if (!fs.existsSync(runtimeDirPath)) {
			fs.mkdirSync(runtimeDirPath, { recursive: true });
		}
		await updateTkoolmvNamagameKitRuntime(runtimeDirPath);
		const zip = new admZip(path.join(runtimeDirPath, "tkoolmv-namagame-runtime.zip"));
		zip.extractAllTo(unzipDirPath);
	} catch (e) {
		console.error(e);
	}
}

let playgroundServer: PlaygroundServer | null = null;
const gameBaseDirPath: string = fs.mkdtempSync(path.join(os.tmpdir(), "games"));
// ffmpeg.wasmで音声を圧縮するための一時ディレクトリ
const audioBaseDirPath: string = fs.mkdtempSync(path.join(os.tmpdir(), "audio"));

// package.json の動的読み込みのため、require の lint エラーを抑止
/* eslint-disable @typescript-eslint/no-var-requires */
const packageJson = require(path.resolve(__dirname, "..", "..", "package.json"));
app.setAboutPanelOptions({
	applicationName: "RPGツクールMVニコ生ゲーム化コンバーター",
	applicationVersion: `v${packageJson.version}`,
	copyright: "Copyright (c) 2024 DWANGO Co., Ltd.",
	credits: `This software uses libraries from the FFmpeg project under the LGPLv2.1.
https://www.ffmpeg.org/legal.html
"RPGツクール" は株式会社 Gotcha Gotcha Games の登録商標です。`,
	iconPath: path.resolve(__dirname, "..", "..", "img/icon.png")
});

const template: MenuItemConstructorOptions[] = [
	{ role: "fileMenu" },
	{ role: "viewMenu" },
	{ role: "windowMenu" },
	{ role: "help", submenu: [{ role: "about", label: "Software version" }] }
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// 他の処理に影響を与えず、awaitは必要ない処理なので、lint エラーを抑止
// eslint-disable-next-line @typescript-eslint/no-floating-promises
app.whenReady().then(async () => {
	// アップデートをチェック
	await autoUpdater.checkForUpdates();
	await createWindow();
	await updateModule();
	playgroundServer = createPlaygroundServer(gameBaseDirPath, audioBaseDirPath);
	app.on("activate", async () => {
		// On macOS it"s common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow();
		}
	});
});

ipcMain.handle("get-assets-size", async (_event, dirPath) => {
	return await getAssetsSize(dirPath);
});

ipcMain.handle("generate-nama-game-dir", async (_event, dirPath, usePluginConverter) => {
	return await convertTkoolmv(gameBaseDirPath, dirPath, path.join(unzipDirPath, "tkoolmv-namagame-runtime"), usePluginConverter);
});

ipcMain.handle("get-audio-data", (_event, dirPath) => {
	return getAudioData(dirPath, `${playgroundServer!.baseUrl}/audio`, audioBaseDirPath);
});

ipcMain.handle("set-audio-binary", (_event, distDirPath, filePath, binary) => {
	// distDirPathが想定外のパスでないことを確認(generate-nama-game-dir APIの実行結果をそのまま利用する想定なのでエラーにならない想定だが念のため)
	if (path.relative(gameBaseDirPath, distDirPath).indexOf("..") !== -1) {
		throw new Error(`${distDirPath} is not sub directory of ${gameBaseDirPath}`);
	}
	setAudioBinary(path.join(distDirPath, "assets/audio", filePath), binary);
});

ipcMain.handle("generate-nama-game-data", async (_event, distDirPath) => {
	const gameJsonPath = path.join(distDirPath, "game.json");
	const relativePath = path.relative(gameBaseDirPath, distDirPath);
	if (!fs.existsSync(gameJsonPath)) {
		throw new Error("Not Found: " + gameJsonPath);
	}
	if (relativePath.indexOf("..") !== -1) {
		throw new Error(`${distDirPath} is not sub directory of ${gameBaseDirPath}`);
	}
	const buffer = createZip(distDirPath);
	const gameContentUrl = playgroundServer!.baseUrl + getGameContentUrl(relativePath);
	// 設定ファイルの動的読み込みのため、require の lint エラーを抑止
	/* eslint-disable @typescript-eslint/no-var-requires */
	const gameJson = require(gameJsonPath);
	return {
		buffer,
		gameContentUrl,
		gameJson
	};
});

// Quit when all windows are closed, except on macOS. There, it"s common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
	playgroundServer!.server.close();
	sh.rm("-Rf", gameBaseDirPath);
	sh.rm("-Rf", audioBaseDirPath);
	sh.rm("-Rf", unzipDirPath);
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
process.on("uncaughtException", (err: Error) => {
	log.error("electron:event:uncaughtException");
	log.error(err);
	app.quit();
});

// -------------------------------------------
// 自動アップデート関連のイベント処理
// -------------------------------------------
// アップデートのダウンロードが完了
autoUpdater.on("update-downloaded", async event => {
	const returnValue = await dialog.showMessageBox({
		type: "info",
		message: `最新バージョン(${event.version})へのアップデート`,
		detail: `再起動してインストールできます。詳細は以下の「更新内容を確認」から参照してください。`,
		buttons: ["再起動", "後で", "更新内容を確認"]
	});
	if (returnValue.response === 0) {
		autoUpdater.quitAndInstall(); // アプリを終了してインストール
	} else if (returnValue.response === 2) {
		const child = new BrowserWindow({ modal: true, show: true });
		await child.loadURL(`https://github.com/akashic-games/tkoolmv-namagame-converter/releases/tag/v${event.version}`);
	}
});
