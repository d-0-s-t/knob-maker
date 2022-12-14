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
 * This is work in progress. No point in printing these for 
 * actual use.
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
//dimensions in millimeters. Apologies USA

/** @type {import("./knob.js").KNOB_CONFIG} */
const KNOB_CONFIG = {
	body: {
		// topRadius: 5,
		// bottomRadius: 15,
		topRadius: 10,
		bottomRadius: 10,
		radius: 10,
		height: 30,
		sides: 0,
		smoothing: 0,
		balance: 0.5
	},
	screwHole: {
		balance: 1,
		bottomRadius: 5,
		height: 8,
		angle: 0,
		radius: 5,
		topRadius: 5
	},
	pointers: [{
		height: 15,
		radialOffset: 10,
		position: 0.75,
		length: 2,
		angle: 0,
		widthEnd: 0.02,
		widthStart: 0.25
	}],
	surface: {
		knurling: [{
			sizeX: 1,
			sizeY: 1,
			depth: 0.5,
			radialCount: 50,
			verticalOffset: 0,
			rise: 0.9,
			range: [0, 1],
			verticalSpacing: 0
		}],
		/* splines: [{
			angle: 0,
			angleSmoothing: 0,
			bottomScale: 1,
			topScale: 1,
			count: 4,
			height: 1,
			range: [0, 1],
			scaleSmoothing: 0,
			thickness: 0.1,
			rootThickness: 0.7
		}] */
	}

}

/** @type  {CONTROLS_TYPES.BaseProperty} */
const SCHEMA = {
	"properties": {
		body: {
			"properties": {},
			"onChange": () => { updateKnob("body") }
		},
		screwHole: {
			"properties": {},
			"onChange": () => { updateKnob("screwHole") }
		},
		pointers: {
			"type": "array",
			"properties": {},
			"onChange": (key, c) => { updateKnob("pointers", KNOB_CONFIG.pointers.indexOf(c)) }
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
						}
					},
					"onChange": (key, c) => {
						updateKnob("knurling", KNOB_CONFIG.surface.knurling.indexOf(c))
					}
				},
				splines: {
					"type": "array",
					"properties": {
						"range": {
							"type": "range",
							"min": 0,
							"max": 1
						}
					},
					onChange: (key, c) => {
						updateKnob("splines", KNOB_CONFIG.surface.splines.indexOf(c))
					}
				}
			}
		}
	}
}

const SLIDERS = {
	/** @type {{[K in keyof import("./knob.js").KNOB_BODY_CONFIG]: number[]}} */
	body: {
		height: [0.1, 100],
		radius: [4, 100],
		topRadius: [0, 100],
		bottomRadius: [0, 100],
		sides: [0, 25, 1],
		balance: [0, 1],
		smoothing: [0, 1]
	},
	screwHole: {
		height: [0.1, 100],
		radius: [0, 10],
		topRadius: [0, 10],
		bottomRadius: [0, 10],
		sides: [0, 25, 1],
		balance: [0, 1],
		angle: [0, 360, 0.5],
		splines: {
			count: [0, 40, 1],
			thickness: [0, 120, 0.5],
			rootThickness: [1, 120, 0.5],
			smoothing: [-1, 1],
			height: [0.1, 5],
			topScale: [0, 1],
			bottomScale: [0, 1],
			scaleSmoothing: [-0.75, 0.75],
			angle: [-90, 90],
			angleSmoothing: [-1, 1]
		}
	},
	/** @type {{[K in keyof import("./knob.js").KNOB_POINTER_CONFIG]: number[]}} */
	pointers: {
		height: [0, 100],
		angle: [0, 360, 0.5],
		position: [0, 1], // The y position relative to  height,
		radialOffset: [0, 100],
		length: [0, 100],
		widthStart: [0, 30, 0.5],
		widthEnd: [0, 30, 0.5]
	},
	surface: {
		knurling: {
			sizeX: [0, 3],
			sizeY: [0, 5],
			depth: [0, 4],
			verticalSpacing: [-4, 4],
			radialCount: [1, 100, 1],
			verticalOffset: [0, 10],
			rise: [0.5, 1],
			shapeRotation: [-180, 180, 0.5]
		},
		splines: {
			count: [0, 40, 1],
			thickness: [0, 120, 0.5],
			rootThickness: [1, 120, 0.5],
			smoothing: [-1, 1],
			height: [0.1, 5],
			topScale: [0, 1],
			bottomScale: [0, 1],
			scaleSmoothing: [-0.75, 0.75],
			angle: [-90, 90, 0.5],
			angleSmoothing: [-1, 1]
		}
	}
}

/** @type {KNOB} */
let currentKnob
let currentUnits = /**@type {"mm"|"inches"} */ ("mm")
const INCHES_TO_MM = 25.4
const ANGLE_TYPES = ["thickness", "rootThickness", "widthStart",
	"shapeRotation", "widthEnd", "angle"
]

function start() {
	setDOM()
	setBindings()
	setScene()
	currentKnob = new KNOB(KNOB_CONFIG, scene)
	//for debugging purposes
	window.currentKnob = currentKnob
}


function setDOM() {
	fillSchema(SLIDERS, SCHEMA)
	SCHEMA.properties.screwHole.properties["splines"] = {
		"type": "array",
		"properties": {
			"range": {
				"type": "range",
				"min": 0,
				"max": 1,
			}
		},
		"onChange": (key, c) => {
			updateKnob("internalSplines", KNOB_CONFIG.screwHole.splines.indexOf(c))
		}
	}
	fillSchema(SLIDERS.screwHole.splines, SCHEMA.properties.screwHole.properties["splines"])
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
				transformOut: isAngleType ? toDegrees : toCurrentUnits
			}
		}
	}
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toMM(input) {
	if (currentUnits == "mm")
		return input
	else
		return input * INCHES_TO_MM
}

/**
 * @param {number} input 
 * @returns {number}
 */
function toCurrentUnits(input) {
	if (currentUnits == "mm")
		return input
	else
		return input / INCHES_TO_MM
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
	new CONTROLS(SCHEMA, document.querySelector("#controlsContainer"), KNOB_CONFIG)
	window.addEventListener("resize", onResize)
	document.getElementById("downloadSTL").addEventListener("click", () => { currentKnob.exportSTL(true) })
}

function setScene() {
	new BABYLON.HemisphericLight("mainLight", new BABYLON.Vector3(1, 1, 1), scene)
	camera.attachControl(canvas, true)
	engine.runRenderLoop(() => { scene.render() })
}

/**
 * @param {keyof import("./knob.js").KNOB_CONFIG|"knurling"|"splines"|"internalSplines"|"threads"} updatedPart 
 * @param {number} [index]
 */
function updateKnob(updatedPart, index) {
	currentKnob.update(KNOB_CONFIG, [updatedPart], index >= 0 ? index : null)
}

window.onload = start