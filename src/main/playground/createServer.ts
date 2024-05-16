import * as http from "http";
import * as path from "path";
import * as express from "express";

export interface PlaygroundServer {
	server: http.Server;
	baseUrl: string;
}

export function createPlaygroundServer(gameBaseDir: string, audioBaseDir?: string): PlaygroundServer {
	const playgroundDst = path.join(__dirname, "..", "..", "playground");
	const ffmpegDst = path.join(__dirname, "..", "..", "ffmpeg");
	const app = express();
	app.use((_req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Credentials", "true");
		next();
	});
	app.use("/playground/", express.static(playgroundDst));
	app.use("/games/", express.static(gameBaseDir));
	app.use("/ffmpeg/", express.static(ffmpegDst));
	if (audioBaseDir) {
		// renderer プロセスから ffmpeg.wasm がアクセスできるようにホストする
		app.use("/audio/", express.static(audioBaseDir));
	}
	const port = 3333; // TODO ESModuleが使えるようになったら、get-port使う(electorn v28で対応されるらしい https://github.com/electron/electron/issues/21457)
	const baseUrl = `http://localhost:${port}`;
	const server = http.createServer(app);
	server.listen(port);
	console.log("setup server. port:" + port);
	return {
		server,
		baseUrl
	};
}

export function getGameContentUrl(gameContentDirName: string): string {
	const param = {
		type: "gameJsonUri",
		uri: `/games/${gameContentDirName}/game.json`
	};
	const buffer = Buffer.from(JSON.stringify(param));
	return `/playground/#/snippets/${buffer.toString("base64")}`;
}
