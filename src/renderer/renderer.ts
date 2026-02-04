interface AudioDataParameter {
	name: string;
	url: string;
	path: string;
	size: number;
	isComplement?: boolean;
}

interface ComplementAssetData {
	oggAsset?: AudioDataParameter;
	m4aAsset?: AudioDataParameter;
}

// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention */
declare const FFmpegUtil, FFmpegWASM: any;
const FFMPEG_PREFIX = "ffmpeg_audio_";

window.addEventListener("load", () => {
	// TODO: 操作が必要なDOMがこれ以上増える場合は Alpine.js 等の導入を検討する
	const dropZone = document.getElementById("drop_zone")!;
	const download = document.getElementById("download")! as HTMLButtonElement;
	const reset = document.getElementById("reset")! as HTMLButtonElement;
	const link = document.getElementById("link")! as HTMLButtonElement;
	const messageContainer = document.getElementById("message_container")!;
	const messageArea = document.getElementById("message_area")!;
	const usePluginConverterCheckbox = document.getElementById("use-plugin-converter")! as HTMLInputElement;
	const progressMessage = document.getElementById("progress_message")!;
	const convertProgress = document.getElementById("convert_progress")! as HTMLProgressElement;
	const errorMessageArea = document.getElementById("error_message_area")!;

	function initializeDom(): void {
		dropZone.style.width = "auto";
		dropZone.style.height = "200px";
		download.disabled = true;
		reset.disabled = true;
		messageContainer.hidden = false;
		messageArea.innerHTML = "ここに ツクールMVゲームの配布用ファイルをドラッグ＆ドロップしてください。";
		progressMessage.innerHTML = "";
		convertProgress.hidden = true;
		convertProgress.value = 0;
		link.disabled = true;
		link.value = "";
		errorMessageArea.innerHTML = "";
		usePluginConverterCheckbox.disabled = false;
		usePluginConverterCheckbox.checked = false;
	}

	// 対象ディレクトリ中の全音声ファイルを圧縮する
	// 本来はメインプロセス側で行うべき処理だが、ffmpeg.wasmがNode.jsに対応していないためレンダラー側で行う
	async function generateNamagameAudioAssets(gameSrcDirPath: string): Promise<void> {
		try {
			const audioData: AudioDataParameter[] = await (window as any).tkoolmvApi.getAudioData(gameSrcDirPath);
			const ffmpeg = new FFmpegWASM.FFmpeg();
			// 1回のFFmpegインスタンスで処理できるファイル数に制限があるため、分割して処理する
			const unit = 15;
			for (let i = 0; i * unit < audioData.length; i++) {
				const complementMap = new Map<string, ComplementAssetData>();
				await ffmpeg.load({
					coreURL: "./ffmpeg-core/ffmpeg-core.js"
				});
				for (let j = 0; j < unit && i * unit + j < audioData.length; j++) {
					const asset = audioData[i * unit + j];
					const assetKey = asset.name.replace(/^(.+)\..+$/, "$1");
					await ffmpeg.writeFile(asset.name, await FFmpegUtil.fetchFile(asset.url));
					// 再生時間が非常に短い(サイズが小さい)oggファイルは、圧縮処理によって一部環境で再生できなくなることがあるため、処理を分けている
					if (asset.size < 10000 && /\.ogg$/.test(asset.name)) {
						// 経験的に問題ないパラメーターを使うことで圧縮より再生可能であることを優先する
						await ffmpeg.exec(["-i", asset.name, "-ab", "64k", "-ar", "44100", "-ac", "1", FFMPEG_PREFIX + asset.name]);
						complementMap.set(assetKey, createComplementData(complementMap, asset));
					} else {
						await ffmpeg.exec(["-i", asset.name, "-ab", "24k", "-ar", "22050", "-ac", "1", FFMPEG_PREFIX + asset.name]);
						complementMap.set(assetKey, createComplementData(complementMap, asset));
					}
					await setAudioBinary(asset, ffmpeg);
				}

				// 不足している asset (.ogg/.m4a) を補完
				for (const [key, data] of complementMap) {
					let asset;
					if (!data.oggAsset) {
						const srcAsset = data.m4aAsset!;
						const assetName = key + ".ogg";
						await ffmpeg.exec(["-i", srcAsset.name, "-map", "a", "-acodec", "libvorbis", FFMPEG_PREFIX + assetName]);
						asset = createAsset(assetName, srcAsset, ".ogg");
					} else if (!data.m4aAsset) {
						const srcAsset = data.oggAsset!;
						const assetName = key + ".m4a";
						await ffmpeg.exec(["-i", srcAsset.name, "-map", "a", "-strict", "2", FFMPEG_PREFIX + assetName]);
						asset = createAsset(assetName, srcAsset, ".m4a");
					} else {
						continue;
					}
					await setAudioBinary(asset, ffmpeg);
				}
				await ffmpeg.terminate();
			}
		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	async function setAudioBinary(asset: AudioDataParameter, ffmpeg: any): Promise<void> {
		let audioBinary: Uint8Array = await ffmpeg.readFile(FFMPEG_PREFIX + asset.name);
		if (!asset.isComplement) {
			asset.size = audioBinary.byteLength;
		}
		if (!asset.isComplement && asset.size <= audioBinary.byteLength) {
			// 圧縮できなかったことをログに残して、元のデータをそのまま使うように
			audioBinary = await ffmpeg.readFile(asset.name);
		}
		await (window as any).tkoolmvApi.setAudioBinary(gameDistDirPath, asset.path, audioBinary);
	}

	function createComplementData(map: Map<string, ComplementAssetData>, asset: AudioDataParameter): ComplementAssetData {
		const isOgg = /\.ogg$/.test(asset.name);
		const key = asset.name.replace(/^(.+)\..+$/, "$1");
		const data = map.get(key);
		return {
			oggAsset: data?.oggAsset ?? isOgg ? asset : undefined,
			m4aAsset: data?.m4aAsset ?? !isOgg ? asset : undefined
		};
	}

	function createAsset(name: string, srcAsset: AudioDataParameter, ext: string): AudioDataParameter {
		return {
			name,
			url: srcAsset.url.replace(/\.[^/.]+$/, ext),
			path: srcAsset.path.replace(/\.[^/.]+$/, ext),
			size: 0, // setAudioBinary() で ffmpeg.readFile() した時に設定する
			isComplement: true // 補完フラグ
		};
	}

	let gameZip: Buffer | null = null;
	let speedPerSec: number = 1000000;
	let isConverting: boolean = false;
	let iframElement: HTMLIFrameElement | null = null;
	let gameDistDirPath: string | null = null;
	dropZone.addEventListener("drop", async ev => {
		let timerId: number | null = null;
		try {
			ev.preventDefault();
			if (isConverting || gameZip || !ev.dataTransfer?.files?.length || !ev.dataTransfer?.items?.length) return;
			isConverting = true;
			messageArea.innerHTML = "ニコ生ゲーム生成中です。少々お待ちください。";
			usePluginConverterCheckbox.disabled = true;
			errorMessageArea.innerHTML = "";
			const gameSrcDirPath = ev.dataTransfer.files[0].path;
			const dirSize = await (window as any).tkoolmvApi.getAssetsSize(gameSrcDirPath);
			const startTime = Date.now();
			const estTime = Math.round(dirSize / speedPerSec);
			convertProgress.hidden = false;
			let currentTime = 0;
			timerId = window.setInterval(() => {
				convertProgress.value += 1 / estTime;
				if (convertProgress.value > 1) {
					convertProgress.value = 1;
				}
				currentTime++;
				progressMessage.innerHTML = `残り${currentTime < estTime ? estTime - currentTime : 0}秒(予想)`;
			}, 1000);
			gameDistDirPath = await (window as any).tkoolmvApi.generateNamaGameDir(gameSrcDirPath, usePluginConverterCheckbox.checked);
			await generateNamagameAudioAssets(gameSrcDirPath);
			const response = await (window as any).tkoolmvApi.generateNamaGameData(gameDistDirPath);
			dropZone.style.width = `${Math.round(response.gameJson.width * 1.2)}px`;
			dropZone.style.height = `${Math.round(response.gameJson.height * 1.2)}px`;
			convertProgress.hidden = true;
			const endTime = Date.now();
			gameZip = response.buffer;
			messageContainer.hidden = true;
			iframElement = document.createElement("iframe");
			iframElement.src = response.gameContentUrl;
			iframElement.width = "100%";
			iframElement.height = "100%";
			// スクリプトの実行以外を許可しないように sandbox 属性を設定する
			// sandbox は誤って TS の型上 readonly とされているので as any とする
			(iframElement as any).sandbox = "allow-scripts";
			dropZone.append(iframElement);
			download.disabled = false;
			reset.disabled = false;
			link.disabled = false;
			link.value = response.gameContentUrl;
			speedPerSec = Math.round(dirSize / ((endTime - startTime) / 1000)); // 変換スピード更新
		} catch (e) {
			errorMessageArea.innerHTML = `ゲーム変換時に次のエラーが発生：${e.message}`;
		} finally {
			usePluginConverterCheckbox.disabled = false;
			isConverting = false;
			if (timerId) {
				window.clearInterval(timerId);
				timerId = null;
			}
		}
	});
	dropZone.addEventListener("dragover", ev => ev.preventDefault());

	download.addEventListener("click", () => {
		if (!gameZip) {
			return;
		}
		const blob = new Blob([gameZip], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.target = "_blank";
		anchor.download = "game.zip";
		anchor.click();
		URL.revokeObjectURL(url);
	});

	reset.addEventListener("click", () => {
		if (!gameZip) {
			return;
		}
		gameZip = null;
		if (iframElement) {
			iframElement.remove();
			iframElement = null;
		}
		initializeDom();
	});

	link.addEventListener("click", () => {
		if (link.value) {
			window.open(link.value, "_blank");
		}
	});
});
