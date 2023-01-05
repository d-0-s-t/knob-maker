const FS = require("fs")
const chokidar = require("chokidar")

const FILES_TO_WATCH = ["src"]
const resolveImports = {
	"babylonjs": "node_modules/babylonjs/babylon.js",
	"babylonjs-serializers": "node_modules/babylonjs-serializers/babylonjs.serializers.js"
}

//copy dependencies to the demo folder
for (let key in resolveImports) {
	FS.copyFileSync(resolveImports[key], `demo/scripts/${key}.js`)
}

//copy source file to demo folder
function copySource() {
	const content = FS.readFileSync("src/knob.js", "utf-8").replace(/import[\s{][\s\S]*?['"][\s;]/g,
		function(importLine) {
			const importRegex = /["']([a-zA-Z_\-\\/.0-9]*)?["']/
			const matches = importLine.match(importRegex)
			if (!matches || !matches[1])
				return importLine
			else if (resolveImports[matches[1]])
				return `import "./${matches[1]}.js"\n`
		})
	FS.writeFileSync("demo/scripts/knob.js", content, "utf-8")
	console.log("Sources Copied")
}

copySource()

chokidar.watch(FILES_TO_WATCH).on("change", copySource)