import * as http from "http";
import * as path from "path";
import * as express from "express";
import * as helmet from "helmet";

export interface PlaygroundServer {
	server: http.Server;
	baseUrl: string;
}

export function createPlaygroundServer(gameBaseDir: string, audioBaseDir?: string): PlaygroundServer {
	const playgroundDst = path.join(__dirname, "..", "..", "playground");
	const app = express();
	app.use((_req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Credentials", "true");
		next();
	});
	app.use(
		helmet.contentSecurityPolicy({
			directives: {
				defaultSrc: ["'none'"],
				scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
				connectSrc: ["'self'"],
				imgSrc: ["'self'", "data:"],
				mediaSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				baseUri: ["'none'"],
				formAction: ["'none'"],
				workerSrc: ["'self'"],
				frameAncestors: ["'self'", "file://*"]
			}
		})
	);
	app.use("/playground/", express.static(playgroundDst));
	app.use("/games/", express.static(gameBaseDir));
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
