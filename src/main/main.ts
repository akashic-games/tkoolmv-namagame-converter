import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import * as log from "electron-log";
import { autoUpdater } from "electron-updater";
import * as sh from "shelljs";
import { getAssetsSize, convertTkoolmv, getAudioData, setAudioBinary } from "./convert/convertTkoolmv";
import type { PlaygroundServer } from "./playground/createServer";
import { createPlaygroundServer, getGameContentUrl } from "./playground/createServer";
import { createZip } from "./util/createZip";

function createWindow(): void {
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
	mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));
	// リンクをクリックすると標準のWebブラウザで開くように
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:/.test(url)) {
			shell.openExternal(url);
		}
		return { action: "deny" };
	});
}

let playgroundServer: PlaygroundServer | null = null;
const gameBaseDirPath: string = fs.mkdtempSync(path.join(os.tmpdir(), "games"));
// ffmpeg.wasmで音声を圧縮するための一時ディレクトリ
const audioBaseDirPath: string = fs.mkdtempSync(path.join(os.tmpdir(), "audio"));

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// アップデートをチェック
	autoUpdater.checkForUpdates();
	createWindow();
	playgroundServer = createPlaygroundServer(gameBaseDirPath, audioBaseDirPath);
	app.on("activate", () => {
		// On macOS it"s common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

ipcMain.handle("get-assets-size", async (_event, dirPath) => {
	return await getAssetsSize(dirPath);
});

ipcMain.handle("generate-nama-game-dir", async (_event, dirPath) => {
	return await convertTkoolmv(gameBaseDirPath, dirPath);
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
// アップデートがあるとき
autoUpdater.on("update-available", () => {
	dialog.showMessageBox({
		message: "アップデートがあります",
		buttons: ["OK"]
	});
});

// アップデートのダウンロードが完了
autoUpdater.on("update-downloaded", async () => {
	const returnValue = await dialog.showMessageBox({
		type: "info",
		message: "アップデートあり",
		detail: "再起動してインストールできます。",
		buttons: ["再起動", "後で"]
	});
	if (returnValue.response === 0) {
		autoUpdater.quitAndInstall(); // アプリを終了してインストール
	}
});
