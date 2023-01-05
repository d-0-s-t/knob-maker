/**
 * Copyright (c) 2022 d0st
 * 
 * HomePage: https://www.d0st.me
 * 
 * MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * This is work in progress. Prints can be made for testing.
 * May not be suitable for production, yet.
 */

import "./babylonjs.js"
import { CONTROLS } from "./controls.js"
import { KNOB } from "./knob.js"

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#mainCanvas")
const engine = new BABYLON.Engine(canvas)
const scene = new BABYLON.Scene(engine)
const camera = new BABYLON.ArcRotateCamera("mainCamera", 0, Math.PI / 3, 100,
	new BABYLON.Vector3(0, 0, 0),
	scene
)

//working dimensions in millimeters. Apologies USA

//Please contribute if you make a commonly used knob for a standard tool
const KNOB_TEMPLATES = [{
	"name": "Knurled Keyed Pot. #1",
	"source": "R10-K5-K.json",
}, {
	"name": "Accident",
	"source": "accident.json"
}, {
	"name": "Threads Test",
	"source": "threadsTest.json"
}]

const KNOBS_FOLDER = "./assets/knobs/"

/** @type {import("./knob.js").KNOB_CONFIG} */
let currentConfig

/** @type  {CONTROLS_TYPES.BaseProperty} */
const SCHEMA = {
	"properties": {
		body: {
			"properties": {
				"segments": {
					"type": "array",
					"compact": true,
					"properties": {},
					"tip": "Segments define the side profile of the knob"
				}
			},
			"onChange": () => { updateKnob("body") }
		},
		screwHole: {
			"properties": {
				"segments": {
					"type": "array",
					"compact": true,
					"properties": {},
					"tip": "Segments define the profile of the internal hole."
				}
			},
			"onChange": () => { updateKnob("screwHole") }
		},
		pointers: {
			"type": "array",
			"properties": {},
			"onChange": (key, c) => { updateKnob("pointers", currentConfig.pointers.indexOf(c)) },
			"default": {
				angle: 0,
				height: 10,
				length: 8,
				position: 0.9,
				radialOffset: 10,
				widthEnd: 0.03490658503988659,
				widthStart: 0.5235987755982988
			}
		},
		surface: {
			"properties": {
				knurling: {
					"type": "array",
					"properties": {
						"shape": {
							"type": "option",
							"options": ["pyramid", "cone", "rectangle", "cylinder", "triangle"]
						},
						"range": {
							"type": "range",
							"min": 0,
							"max": 1,
							"tip": "Span of the knurling along the height of the knob."
						}
					},
					default: {
						"range": [
							0.05,
							0.95
						],
						"width": 1,
						"height": 1,
						"depth": 0.3,
						"shape": "pyramid",
						"verticalOffset": 0.75,
						"verticalSpacing": 0.5,
						"columns": 140,
						"shapeRotation": 0.7853981633974483
					},
					"onChange": (key, c) => {
						updateKnob("knurling", currentConfig.surface.knurling.indexOf(c))
					}
				},
				splines: {
					"type": "array",
					"properties": {
						"subtractive": {
							"type": "toggle",
							"tip": "When checked splines are cut on the body"
						},
						"range": {
							"type": "range",
							"min": 0,
							"max": 1
						},
						"taperWidth": {
							"type": "toggle",
							"tip": "By default only height is scaled. Enable this to taper width/thickness as well."
						}
					},
					"default": {
						count: 5,
						height: 3,
						range: [0, 1],
						rootThickness: 0.5235987755982988,
						thickness: 0.17453292519943295,
					},
					onChange: (key, c) => {
						updateKnob("splines", currentConfig.surface.splines.indexOf(c))
					}
				},
				threads: {
					"type": "array",
					"properties": {
						"range": {
							"type": "range",
							"min": 0,
							"max": 1,
							"tip": "Span of the threads along the external profile"
						},
						"leftHanded": {
							"type": "toggle",
							"tip": "direction of winding"
						}
					},
					"default": {
						pitch: 2.5
					},
					onChange: (key, c) => {
						updateKnob("threads", currentConfig.surface.threads.indexOf(c))
					}
				}
			}
		}
	}
}

const SLIDERS = {
	body: {
		height: [0.1, 100, null, "Sets the overall height of the knob"],
		sides: [0, 25, 1, "Number of faces radially. Use high number for a smooth lathe"],
		segments: {
			radius: [3, 100, null, "Radius"],
			height: [0, 1, null, "Percentage position along the height. Enter values in range [0, 1]"],
			smoothing: [-1, 1, null, "Curve the side profile. Negatives values curve inward [-1, 1]."]
		}
	},
	screwHole: {
		sides: [0, 25, 1, "Number of internal faces radially."],
		angle: [0, 360, 0.5, "The angle offset. Useful when hole isn't a smooth lathe."],
		segments: {
			radius: [3, 100],
			height: [0, 1, null, "Percentage position along the height of the knob."],
			smoothing: [-1, 1, null, "Curve the side profile. Negatives values curve inward [-1, 1]."]
		},
		splines: {
			count: [0, 40, 1, "Number of splines radially"],
			thickness: [0, 120, 0.5, "Thickness at the tip of the spline profile in degrees."],
			rootThickness: [1, 120, 0.5, "Thickness at the base of the spline profile in degrees."],
			smoothing: [-1, 1, null, "Smooth the spline profile when tip and root thickness are different."],
			width: [0, 10, null, "Setting this ignores thickness and creates spline with a constant width."],
			height: [0.1, 5, null, "Optional. When not set creates shortest possible spline. Useful to create flat sections of d-shafts."],
			topScale: [0, 1, null, "Use <1 to taper at the top"],
			bottomScale: [0, 1, null, "Use <1 to taper at the bottom"],
			scaleSmoothing: [-0.75, 0.75, null, "Use in conjunction with top/bottom scale to smooth the scaling along the profile."],
			angle: [-90, 90, 0.5, "Curve the spline radially"],
			angleSmoothing: [-1, 1, null, "Smooth the curve angle [-1,1]"],
		},
		threads: {
			pitch: [0.1, 10],
			depth: [0.1, 10, null, "Optional. When not set depth is computed as per metric standards."],
			taperTop: [0, 0.5, null, "Start tapering at percentage position from top in the thread range"],
			taperBottom: [0, 0.5, null, "Start tapering at percentage position from bottom in the thread range"]
		}
	},
	pointers: {
		height: [0, 100, null, "Absolute height of the pointer"],
		angle: [0, 360, 0.5, "Angle offset from body"],
		position: [0, 1, null, "Percentage position along the height of the body [0,1]"],
		radialOffset: [0, 100, null, "Radial distance from the center of the knob."],
		length: [0, 100, null],
		widthStart: [0, 30, 0.5, "In degrees."],
		widthEnd: [0, 30, 0.5, "In degrees."]
	},
	surface: {
		knurling: {
			width: [0, 3, null, "The width of the individual knurling shape"],
			height: [0, 5, null, "Height of the individual knurling shape"],
			depth: [0, 4, null],
			verticalSpacing: [-4, 4, null, "The space between indiviual shapes"],
			columns: [1, 200, 1],
			verticalOffset: [0, 10, null, "Offset between columns of shapes"],
			rise: [0.5, 1, null, "Not to be confused with depth. Shapes are tagent to the surface with flat base. With values <1 they can become flush", 0.9],
			shapeRotation: [-180, 180, 0.5],
			taper: [0, 0.5, null, "Use this to taper knurling at the boundaries [0, 0.5]. Value is percentage of range from boundaries."]
		},
		splines: {
			count: [0, 40, 1, "Number of splines radially"],
			thickness: [0, 120, 0.5, "Thickness at the tip of the spline profile in degrees."],
			rootThickness: [1, 120, 0.5, "Thickness at the base of the spline profile in degrees."],
			smoothing: [-1, 1, null, "Smooth the spline profile when tip and root thickness are different."],
			width: [0, 10, null, "Setting this ignores thickness and creates spline with a constant width."],
			height: [0.1, 5, null],
			topScale: [0, 1, null, "Use <1 to taper at the top", 1],
			bottomScale: [0, 1, null, "Use <1 to taper at the bottom", 1],
			scaleSmoothing: [-0.75, 0.75, null, "Use in conjunction with top/bottom scale to smooth the scaling along the profile."],
			angle: [-90, 90, 0.5, "Curve the spline radially"],
			angleSmoothing: [-1, 1, null, "Smooth the curve angle [-1,1]"],
		},
		threads: {
			pitch: [0.1, 10],
			depth: [0.1, 10, null, "Optional. When not set depth is computed as per metric standards."],
			taperTop: [0, 0.5, null, "Start tapering at percentage position from top in the thread range"],
			taperBottom: [0, 0.5, null, "Start tapering at percentage position from bottom in the thread range"]
		}
	}
}

/** @type {KNOB} */
let currentKnob
/** @type {CONTROLS} */
let currentControls

let currentUnits = /**@type {"mm"|"inch"|"cm"} */ ("mm")
let knobSelector = document.querySelector("#permaContainer").querySelector("select")
const INCHES_TO_MM = 25.4
const ANGLE_TYPES = ["thickness", "rootThickness", "widthStart",
	"shapeRotation", "widthEnd", "angle"
]
/** @type {import("./knob.js").KNOB_CONFIG} */
let initialConfigState

function start() {
	setDOM()
	setBindings()
	setScene()
	loadKnobFrom(knobSelector.options[1].value)
}

function setDOM() {
	fillSchema(SLIDERS, SCHEMA)
	SCHEMA.properties.screwHole.properties["splines"] = {
		"type": "array",
		"properties": {
			"subtractive": {
				"type": "toggle",
				"tip": "When checked splines are cut on the body"
			},
			"range": {
				"type": "range",
				"min": 0,
				"max": 1,
			},
			"taperWidth": {
				"type": "toggle"
			}
		},
		default: {
			count: 6,
			height: 2,
			range: [0, 1],
			rootThickness: 0.5235987755982988,
			thickness: 0.17453292519943295,
		},
		"onChange": (key, c) => {
			updateKnob("internalSplines", currentConfig.screwHole.splines.indexOf(c))
		}
	}
	SCHEMA.properties.screwHole.properties["threads"] = {
		"type": "array",
		"properties": {
			"range": {
				"type": "range",
				"min": 0,
				"max": 1
			},
			"leftHanded": {
				"type": "toggle",
				"tip": "Winding direction of threads."
			}
		},
		"default": {
			pitch: 2.5
		},
		"onChange": (key, c) => {
			updateKnob("internalThreads", currentConfig.screwHole.threads.indexOf(c))
		}
	}
	SCHEMA.properties.surface.properties["knurling"].properties["taperAll"] = {
		"type": "toggle",
		"tip": "Scale all dimensions. When disabled only the depth is scaled."
	}
	fillSchema(SLIDERS.screwHole.threads, SCHEMA.properties.screwHole.properties["threads"])
	fillSchema(SLIDERS.screwHole.splines, SCHEMA.properties.screwHole.properties["splines"])
	KNOB_TEMPLATES.forEach((knobInfo) => {
		const option = document.createElement("option")
		option.value = knobInfo.source
		option.innerHTML = knobInfo.name
		knobSelector.appendChild(option)
	})
	onResize()
}

/**
 * @param {*} source
 * @param {CONTROLS_TYPES.ControlType|CONTROLS_TYPES.BaseProperty} schemaTarget
 */
function fillSchema(source, schemaTarget) {
	for (let key in source) {
		if (source[key].constructor != Array) {
			fillSchema(source[key], schemaTarget.properties[key])
		} else if (schemaTarget) {
			if (!schemaTarget.properties)
				schemaTarget.properties = {}
			const isAngleType = ANGLE_TYPES.indexOf(key) + 1
			schemaTarget.properties[key] = {
				type: "number",
				min: source[key][0],
				max: source[key][1],
				step: source[key][2],
				transformIn: isAngleType ? toRadians : toMM,
				transformOut: isAngleType ? toDegrees : toCurrentUnits,
				tip: source[key][3],
				default: source[key][4]
			}
		}
	}
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toMM(input) {
	switch (currentUnits) {
		case "cm":
			return input * 10
		case "mm":
			return input
		case "inch":
			return input * INCHES_TO_MM
	}
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toCurrentUnits(input) {
	switch (currentUnits) {
		case "cm":
			return input / 10
		case "mm":
			return input
		case "inch":
			return input / INCHES_TO_MM
	}
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toRadians(input) {
	return input * Math.PI / 180
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toDegrees(input) {
	return input * 180 / Math.PI
}

function onResize() {
	const drawingContainer = document.querySelector("#drawingContainer")
	canvas.width = drawingContainer.clientWidth
	canvas.height = drawingContainer.clientHeight
	engine.resize()
}

function setBindings() {
	window.addEventListener("resize", onResize)
	const inputElement = /** @type {HTMLInputElement} */ (document.getElementById("openConfig"))
	inputElement.addEventListener("input", function() {
		let reader = new FileReader()
		/**
		 * @param {Event} event 
		 */
		reader.onload = function(event) {
			const fileContent = event.target.result
			try {
				const parsedObject = JSON.parse( /** @type {string} */ (fileContent))
				setKnobForEditing(parsedObject)
			} catch (e) {
				console.log("Unable to read file")
			} finally {
				inputElement.value = null
			}
		}
		reader.readAsText(inputElement.files[0])
	})
	document.getElementById("downloadSTL").addEventListener("click", () => { currentKnob.exportSTL(true) })
	document.getElementById("downloadConfig").addEventListener("click", () => { currentKnob.exportJSON(true) })
	document.getElementById("undoButton").addEventListener("click", () => {
		const event = new KeyboardEvent("keypress", {
			ctrlKey: true,
			key: "z"
		})
		document.dispatchEvent(event)
	})
	document.getElementById("redoButton").addEventListener("click", () => {
		const event = new KeyboardEvent("keypress", {
			ctrlKey: true,
			key: "y"
		})
		document.dispatchEvent(event)
	})
	const onKnobSelect = () => {
		let src = knobSelector.selectedOptions[0].value
		if (src == "none")
			src = knobSelector.options[1].value
		loadKnobFrom(src)
	}
	knobSelector.addEventListener("change", onKnobSelect)
	document.getElementById("resetButton").addEventListener("click", () => {
		setKnobForEditing(initialConfigState)
	})
	document.querySelector("#unitsSelectorContainer").querySelectorAll("input").forEach(input => {
		input.addEventListener("change", function() {
			currentUnits = /** @type {"mm"|"cm"|"inch"} */ (input.value)
			currentControls.updateDOM()
		})
	})
	/** @type {HTMLInputElement} */
	const draftModeToggle = document.querySelector("input#draftModeToggle")
	draftModeToggle.addEventListener("input", () => {
		currentKnob.setDraftMode(draftModeToggle.checked)
	})
}

/**
 * @param {string} src 
 */
function loadKnobFrom(src) {
	fetch(KNOBS_FOLDER + src).then((response) => {
		response.json().then((json) => {
			setKnobForEditing(json)
		}).catch((e) => {
			console.log("Failed to load config:" + e)
		})
	})
}

/**
 * @param {import("./knob.js").KNOB_CONFIG} config 
 */
function setKnobForEditing(config) {
	/**
	 * Controls doesn't have a dispose method. Research if necessary.
	 * We set the controls first becuase, it can help us with setting 
	 * some defaults
	 */
	initialConfigState = JSON.parse(JSON.stringify(config))
	currentConfig = config
	currentControls = null
	currentControls = new CONTROLS(SCHEMA, document.querySelector("#controlsContainer"), currentConfig, 1000)

	//first dispose the old one if already created
	currentKnob && currentKnob.dispose()
	currentKnob = new KNOB(currentConfig, scene)

	//for debugging
	//@ts-ignore
	window.currentKnob = currentKnob
	//@ts-ignore
	window.currentControls = currentControls
}

function setScene() {
	new BABYLON.HemisphericLight("mainLight", new BABYLON.Vector3(1, 1, 1), scene)
	camera.attachControl(canvas, true)
	engine.runRenderLoop(() => { scene.render() })
}

/**
 * @param {import("./knob.js").UpdateKey} updatedPart 
 * @param {number} [index]
 */
function updateKnob(updatedPart, index) {
	currentKnob.update(currentConfig, [updatedPart], index >= 0 ? index : null)
}

window.onload = start