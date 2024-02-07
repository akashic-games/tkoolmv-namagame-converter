interface AudioDataParameter {
	name: string;
	url: string;
	path: string;
	size: number;
}

// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention */
declare const FFmpegUtil, FFmpegWASM: any;

window.addEventListener("load", () => {
	// TODO: 操作が必要なDOMがこれ以上増える場合は Alpine.js 等の導入を検討する
	const dropZone = document.getElementById("drop_zone")!;
	const download = document.getElementById("download")! as HTMLButtonElement;
	const reset = document.getElementById("reset")! as HTMLButtonElement;
	const link = document.getElementById("link")! as HTMLButtonElement;
	const messageContainer = document.getElementById("message_container")!;
	const messageArea = document.getElementById("message_area")!;
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
				await ffmpeg.load({
					coreURL: "./ffmpeg-core/ffmpeg-core.js"
				});
				for (let j = 0; j < unit && i * unit + j < audioData.length; j++) {
					const asset = audioData[i * unit + j];
					const prefix = "ffmpeg_audio_";
					await ffmpeg.writeFile(asset.name, await FFmpegUtil.fetchFile(asset.url));
					await ffmpeg.exec(["-i", asset.name, "-ab", "24k", "-ar", "22050", "-ac", "1", prefix + asset.name]);
					const audioBinary: Uint8Array = await ffmpeg.readFile(prefix + asset.name);
					if (asset.size <= audioBinary.byteLength) {
						throw new Error(`can not compress audio, before:${asset.size}, after:${audioBinary.byteLength}`);
					}
					await (window as any).tkoolmvApi.setAudioBinary(gameDistDirPath, asset.path, audioBinary);
				}
				await ffmpeg.terminate();
			}
		} catch (err) {
			console.log(err);
			throw err;
		}
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
			gameDistDirPath = await (window as any).tkoolmvApi.generateNamaGameDir(gameSrcDirPath);
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
			dropZone.append(iframElement);
			download.disabled = false;
			reset.disabled = false;
			link.disabled = false;
			link.value = response.gameContentUrl;
			speedPerSec = Math.round(dirSize / ((endTime - startTime) / 1000)); // 変換スピード更新
		} catch (e) {
			errorMessageArea.innerHTML = `ゲーム変換時に次のエラーが発生：${e.message}`;
		} finally {
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
