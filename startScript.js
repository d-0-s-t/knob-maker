const FS = require("fs")

const resolveImports = {
	"babylonjs": "../../node_modules/babylonjs/babylon.js",
	"babylonjs-serializers": "../../node_modules/babylonjs-serializers/babylonjs.serializers.js"
}

const content = FS.readFileSync("src/knob.js", "utf-8").replace(/import[\s{][\s\S]*?['"][\s;]/g,
	function(importLine) {
		const importRegex = /["']([a-zA-Z_\-\\/.0-9]*)?["']/
		const matches = importLine.match(importRegex)
		if (!matches || !matches[1])
			return importLine
		else
			return `import "${resolveImports[matches[1]]}"\n`

	})

FS.writeFileSync("demo/js/knob.js", content, "utf-8")