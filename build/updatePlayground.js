const sh = require("shelljs");
const path = require("path");

if (!sh.which("npm")) {
	sh.echo("please install npm");
	sh.exit(1);
}

function runCommand(command) {
	const result = sh.exec(command);
	if (result.code !== 0) {
		sh.exit(1);
	}
}

sh.cd("module/playground");
runCommand("npm ci");

const src = path.join(__dirname, "..", "module", "playground", "dist", "*");
const dst = path.join(__dirname, "..", "lib", "playground");

sh.rm("-rf", dst);
sh.mkdir("-p", dst);
sh.cp("-R", src, dst);
