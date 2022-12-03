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
const camera = new BABYLON.ArcRotateCamera("mainCamera", 0, Math.PI / 3, 50,
	new BABYLON.Vector3(0, 0, 0),
	scene
)
window.scene = scene

//dimensions in millimeters. Apologies USA

/** @type {import("./knob.js").KNOB_CONFIG} */
const KNOB_CONFIG = {
	body: {
		bottomRadius: 10,
		topRadius: 10,
		radius: 10,
		height: 10,
		sides: 0,
		smoothing: 0,
		balance: 0.5
	},
	screwHole: {
		radius: 5,
		topRadius: 5,
		bottomRadius: 5,
		height: 2,
		flatWidth: 0
	},
	pointer: {
		height: 10.29,
		offset: 1.02,
		position: 0.52,
		rEnd: 10.78,
		rStart: 6.37,
		widthEnd: 0.02,
		widthStart: 0.24
	},
	knurling: {
		sizeX: 1,
		sizeY: 1,
		depth: 0.5,
		spacingY: 0.2,
		radialCount: 50,
		verticalOffset: 0
	}
}

window.knobConfig = KNOB_CONFIG

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
		pointer: {
			"properties": {},
			"onChange": () => { updateKnob("pointer") }
		},
		knurling: {
			"properties": {},
			"onChange": () => { updateKnob("knurling") }
		}
		//"splines": {}, to be implemented
	}
}

const SLIDERS = {
	/** @type {{[K in keyof import("./knob.js").KNOB_BODY]: number[]}} */
	body: {
		height: [0.1, 100],
		radius: [4, 100],
		topRadius: [0, 100],
		bottomRadius: [0, 100],
		sides: [0, 25, 1],
		balance: [0, 1],
		smoothing: [0, 1]
	},
	/** @type {{[K in keyof import("./knob.js").KNOB_SLOT]: number[]}} */
	screwHole: {
		height: [0.1, 100],
		radius: [0, 10],
		topRadius: [0, 10],
		bottomRadius: [0, 10],
		sides: [0, 25, 1],
		balance: [0, 1],
		offset: [0, 2 * Math.PI],
		flatWidth: [0, 100]
	},
	/** @type {{[K in keyof import("./knob.js").KNOB_POINTER]: number[]}} */
	pointer: {
		height: [0, 100],
		offset: [0, 2 * Math.PI],
		position: [0, 1], // The y position relative to  height,
		rStart: [0, 100],
		rEnd: [0, 100],
		widthStart: [0, Math.PI / 6],
		widthEnd: [0, Math.PI / 6]
	},
	knurling: {
		sizeX: [0, 3],
		sizeY: [0, 5],
		depth: [0, 4],
		spacingY: [0, 10],
		radialCount: [1, 100, 1],
		verticalOffset: [0, 10]
	}
}

/** @type {KNOB} */
let currentKnob

function start() {
	setDOM()
	setBindings()
	setScene()
	currentKnob = new KNOB(KNOB_CONFIG, scene)
	window.currentKnob = currentKnob
}


function setDOM() {
	fillSchema(SLIDERS, SCHEMA)
	SCHEMA.properties.screwHole.properties.doubleD = {
		"type": "toggle",
	}
	onResize()
}

/**
 * @param {{[s:string]:number[]}} source
 * @param {CONTROLS_TYPES.BaseProperty} schemaTarget
 */
function fillSchema(source, schemaTarget) {
	for (let key in source) {
		if (source[key].constructor != Array)
			fillSchema(source[key], schemaTarget.properties[key])
		else {
			if (!schemaTarget.properties)
				schemaTarget.properties = {}
			schemaTarget.properties[key] = {
				type: "number",
				min: source[key][0],
				max: source[key][1],
				step: source[key][2]
			}
		}
	}
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
	document.getElementById("downloadSTL").addEventListener("click", () => { currentKnob.exportSTL() })
}

function setScene() {
	new BABYLON.HemisphericLight("mainLight", new BABYLON.Vector3(1, 1, 1), scene)
	camera.attachControl(canvas, true)
	engine.runRenderLoop(() => { scene.render() })
}

/**
 * @param {keyof import("./knob.js").KNOB_CONFIG} updatedPart 
 */
function updateKnob(updatedPart) {
	currentKnob.update(KNOB_CONFIG, [updatedPart])
}

window.onload = start