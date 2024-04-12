import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("tkoolmvApi", {
	getAssetsSize: (dirPath: string) => ipcRenderer.invoke("get-assets-size", dirPath),
	// 以下のAPIは本来ならば1つのAPIにまとめるべきだが、最新のffmpeg.wasmがNode.jsに対応していないため音声の圧縮処理はレンダラー側で行う必要があるため、APIを分割している
	generateNamaGameDir: (dirPath: string, usePluginConverter: boolean) =>
		ipcRenderer.invoke("generate-nama-game-dir", dirPath, usePluginConverter),
	getAudioData: (dirPath: string) => ipcRenderer.invoke("get-audio-data", dirPath),
	setAudioBinary: (distDirPath: string, filePath: string, binary: any) =>
		ipcRenderer.invoke("set-audio-binary", distDirPath, filePath, binary),
	generateNamaGameData: (distDirPath: string) => ipcRenderer.invoke("generate-nama-game-data", distDirPath)
});
