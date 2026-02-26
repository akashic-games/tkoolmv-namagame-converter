import { withFFmpegInstance } from "./ffmpegInstance";

interface AudioDataParameter {
	name: string;
	url: string;
	path: string;
	size: number;
}

interface ComplementAudioData {
	oggData?: AudioDataParameter;
	m4aData?: AudioDataParameter;
}

// これらのモジュールはこのスクリプトファイルの呼び出し元である index.html で読み込まれている前提
/* eslint-disable @typescript-eslint/naming-convention */
declare const FFmpegUtil: any;
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
			const audioDataList: AudioDataParameter[] = await (window as any).tkoolmvApi.getAudioData(gameSrcDirPath);
			const complementMap = new Map<string, ComplementAudioData>();
			for (const audioData of audioDataList) { 
				await withFFmpegInstance(async (ffmpeg) => {
					await ffmpeg.writeFile(audioData.name, await FFmpegUtil.fetchFile(audioData.url));
					await generateAudioAsset(audioData, ffmpeg);
					registerComplementData(complementMap, audioData);
				});
			}

			const complementAudioList =  collectLackingAudio(complementMap);
			for (const audioData of complementAudioList) {
				await withFFmpegInstance(async (ffmpeg) => {
					const isOgg = /\.ogg$/.test(audioData.path);
					const dataName = isOgg ? audioData.name.replace(/\.ogg$/, ".m4a") : audioData.name.replace(/\.m4a$/, ".ogg");
					const ffmpegArgs = isOgg
						? ["-i", audioData.name, "-map", "a", "-strict", "2", FFMPEG_PREFIX + dataName]
						: ["-i", audioData.name, "-map", "a", "-acodec", "libvorbis", FFMPEG_PREFIX + dataName]

					const ext = isOgg ? ".m4a" : ".ogg";
					const data = {
						name: dataName,
						url: audioData.url.replace(/\.[^/.]+$/, ext),
						path: audioData.path.replace(/\.[^/.]+$/, ext),
						size: 0, // setAudioBinary() で ffmpeg.readFile() した時に設定する
					};
					await ffmpeg.writeFile(audioData.name, await FFmpegUtil.fetchFile(audioData.url));
					await generateAudioAsset(data, ffmpeg, ffmpegArgs, true);
				});
			}	
		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	async function generateAudioAsset(audioData: AudioDataParameter, ffmpeg: FFmpegInstance, ffmpegArgs?: string[], isComplement?: boolean): Promise<void> {
		try {
			// 再生時間が非常に短い(サイズが小さい)oggファイルは、圧縮処理によって一部環境で再生できなくなることがあるため、処理を分けている
			if (audioData.size < 10000 && /\.ogg$/.test(audioData.name)) {
				// 経験的に問題ないパラメーターを使うことで圧縮より再生可能であることを優先する
				const args = ffmpegArgs ?? ["-i", audioData.name, "-ab", "64k", "-ar", "44100", "-ac", "1", FFMPEG_PREFIX + audioData.name];
				await ffmpeg.exec(args);
			} else {
				const args = ffmpegArgs ?? ["-i", audioData.name, "-ab", "24k", "-ar", "22050", "-ac", "1", FFMPEG_PREFIX + audioData.name];
				await ffmpeg.exec(args);
			}

			let audioBinary = await ffmpeg.readFile(FFMPEG_PREFIX + audioData.name);
			if (isComplement) {
				// 補完した data は作成時にサイズが設定されていないので、読み込んだ後に設定
				audioData.size = audioBinary.byteLength;
			}
			if (!isComplement && audioData.size <= audioBinary.byteLength) {
				// 圧縮できなかったことをログに残して、元のデータをそのまま使うように
				console.log(`can not compress audio: ${audioData.name}, before: ${audioData.size}, after: ${audioBinary.byteLength}`);
				audioBinary = await ffmpeg.readFile(audioData.name);
			}
			await (window as any).tkoolmvApi.setAudioBinary(gameDistDirPath, audioData.path, audioBinary);
		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	function collectLackingAudio(complementMap: Map<string, ComplementAudioData>): AudioDataParameter[] { 
		const complementAudioList: AudioDataParameter[] = [];
		[...complementMap.values()].forEach(data => {
			if (!data.oggData) {
				complementAudioList.push(data.m4aData!);
			} else if (!data.m4aData) {
				complementAudioList.push(data.oggData!);
			}
		});
		return complementAudioList;
	}

	function registerComplementData(map: Map<string, ComplementAudioData>, audioData: AudioDataParameter): void {
		const isOgg = /\.ogg$/.test(audioData.name);
		const key = audioData.name.replace(/^(.+)\..+$/, "$1");
		const data = map.get(key);
		const newData = {
			oggData: data?.oggData ?? isOgg ? audioData : undefined,
			m4aData: data?.m4aData ?? !isOgg ? audioData : undefined
		};
		map.set(key, newData);
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
