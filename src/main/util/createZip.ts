import * as path from "path";
import * as admZip from "adm-zip";

export function createZip(dirPath: string): Buffer {
	const zip = new admZip();
	zip.addLocalFolder(path.relative(process.cwd(), dirPath));
	return zip.toBuffer();
}
