import * as fs from "fs";
import * as path from "path";
import * as admZip from "adm-zip";
import * as sh from "shelljs";

export async function updateTkoolmvNamagameKitRuntime(moduleDirPath: string): Promise<void> {
	const moduleName = "tkoolmv-namagame-kit";
	const versionTxtPath = path.join(moduleDirPath, "version.txt");
	const latestVersion = await getLatestVersion(moduleName);
	if (!fs.existsSync(versionTxtPath)) {
		if (!fs.existsSync(moduleDirPath)) {
			fs.mkdirSync(moduleDirPath, { recursive: true });
		}
		await installModule(moduleName, latestVersion, `tkoolmv-namagame-kit-runtime-${latestVersion}.zip`, moduleDirPath);
		fs.writeFileSync(versionTxtPath, latestVersion);
		return;
	}
	const currentVersion = fs.readFileSync(versionTxtPath).toString().trim();
	if (currentVersion !== latestVersion) {
		const current = currentVersion.split(".");
		const latest = latestVersion.split(".");
		if (current[0] !== latest[0]) {
			return;
		}
		await installModule(moduleName, latestVersion, `tkoolmv-namagame-kit-runtime-${latestVersion}.zip`, moduleDirPath);
		fs.writeFileSync(versionTxtPath, latestVersion);
		return;
	}
}

async function getLatestVersion(moduleName: string): Promise<string> {
	const releaseApiUrl = `https://api.github.com/repos/akashic-games/${moduleName}/releases`;
	const apiResponse = await fetch(releaseApiUrl, {
		headers: {
			"Content-Type": "application/json"
		}
	});
	if (!apiResponse.ok) {
		const errorText = await apiResponse.text();
		throw new Error(`Api Error: ${errorText}, ${releaseApiUrl}`);
	}
	const releaseData = await apiResponse.json();
	return releaseData[0].tag_name.replace("v", "");
}

async function installModule(moduleName: string, version: string, zipFileName: string, dest: string): Promise<void> {
	if (path.extname(zipFileName) !== ".zip") {
		throw new Error(`${zipFileName} is not zip file`);
	}
	const downloadUrl = `https://github.com/akashic-games/${moduleName}/releases/download/v${version}/${zipFileName}`;
	const downloadResponse = await fetch(downloadUrl, {
		headers: { Accept: "application/zip" }
	});
	if (!downloadResponse.ok) {
		const errorText = await downloadResponse.text();
		throw new Error(`Api Error: ${errorText}, ${downloadUrl}`);
	}
	const arrayBuffer = await downloadResponse.arrayBuffer();
	sh.rm("-Rf", path.join(dest, "*"));
	fs.writeFileSync(path.join(dest, zipFileName), Buffer.from(arrayBuffer));
	const zip = new admZip(path.join(dest, zipFileName));
	zip.extractAllTo(dest);
}
