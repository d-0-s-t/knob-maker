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

import * as BABYLON from "babylonjs"
import "babylonjs-serializers"

/**
 * @typedef {object} KNOB_BODY_OPTIONS
 * @property {number} height
 * @property {number} radius
 * @property {number} [topRadius] when not available is equal to radius
 * @property {number} [bottomRadius] When not available is equal to radius
 * @property {number} [sides]
 * @property {number} [balance] section along the height representative
 *  of the radius. default is 0.5
 */

/**
 * @typedef {object} ONLY_KNOB_BODY
 * @property {number} [smoothing] 0 is linear and 1 is curvy
 * @typedef {KNOB_BODY_OPTIONS & ONLY_KNOB_BODY} KNOB_BODY
 */

/**
 * @typedef {object} KNOB_POINTER
 * @property {number} [height]
 * @property {number} [offset]
 * @property {number} [position]
 * @property {number} [rStart]
 * @property {number} [rEnd]
 * @property {number} [widthStart]
 * @property {number} [widthEnd]
 */

/**
 * @typedef {object} ONLY_KNOB_SLOT
 * @property {number} [balance] same as body options but defaults to one
 * @property {number} [offset]
 * @property {number} [flatWidth]
 * @property {number} [doubleD] boolean
 * @typedef {KNOB_BODY_OPTIONS & ONLY_KNOB_SLOT} KNOB_SLOT
 */

/**
 * @typedef {object} KNOB_CONFIG
 * @property {KNOB_BODY} body
 * @property {KNOB_POINTER} [pointer]
 * @property {KNOB_SLOT} [screwHole]
 */

/** one per millimeter */
const TESELLATION = 1

export class KNOB {

	/**
	 * @param {KNOB_CONFIG} config 
	 * @param {BABYLON.Scene} scene 
	 * @param {boolean} [draftMode] [WIP - NOT IMPLEMENTED] Doesn't combine meshes and doesn't perform CSG.
	 * Meshes will be transuncent to see through. This is mainly for performance reasons
	 */
	constructor(config, scene, draftMode) {
		this.fillDefaults(config)
		this.scene = scene
		this.update(config)
	}

	/**
	 * @param {KNOB_CONFIG} config
	 */
	fillDefaults(config) {
		/** @type {KNOB_CONFIG} */
		this.config = JSON.parse(JSON.stringify(config))

		/**
		 * @param {KNOB_BODY_OPTIONS} bodyConfig 
		 */
		function fillDefaultsOnBody(bodyConfig) {
			if (bodyConfig.bottomRadius == undefined)
				bodyConfig.bottomRadius = bodyConfig.radius
			if (bodyConfig.topRadius == undefined)
				bodyConfig.topRadius = bodyConfig.radius
			if (bodyConfig.sides < 3)
				delete bodyConfig.sides
		}
		if (this.config.body.balance == undefined)
			this.config.body.balance = 0.5

		fillDefaultsOnBody(this.config.body)
		if ("screwHole" in this.config) {
			fillDefaultsOnBody(this.config.screwHole)
			if (this.config.screwHole.balance == undefined)
				this.config.screwHole.balance = 1
			if (this.config.screwHole.bottomRadius == undefined)
				this.config.screwHole.bottomRadius = this.config.screwHole.radius
			if (this.config.screwHole.flatWidth == undefined)
				this.config.screwHole.flatWidth = 0
			if (this.config.screwHole.offset == undefined)
				this.config.screwHole.offset = 0
		}

		if ("pointer" in this.config) {
			if (this.config.pointer.offset == undefined)
				this.config.pointer.offset = 0
		}
	}
	/**
	 * @param {KNOB_CONFIG} config
	 * @param {(keyof KNOB_CONFIG)[]} [partsToUpdate] 
	 */
	update(config, partsToUpdate) {
		if (!partsToUpdate || partsToUpdate.length == 0) {
			partsToUpdate = ["body", "pointer", "screwHole"]
		}

		if (partsToUpdate.indexOf("pointer") + 1) {
			this.pointerShape && this.pointerShape.dispose()
			Object.assign(this.config.pointer, config.pointer)
			this.pointerShape = this._createPointer(this.config.pointer)
		}

		let bodyUpdated = false
		if (partsToUpdate.indexOf("body") + 1) {
			this.baseShape && this.baseShape.dispose()
			Object.assign(this.config.body, config.body)
			this.baseShape = this._createBody(this.config.body)
			bodyUpdated = true
		}
		if (partsToUpdate.indexOf("screwHole") + 1) {
			Object.assign(this.config.screwHole, config.screwHole)
			const tempShape = this._createScrewHole(this.config.screwHole)
			this.screwHoleShape && this.screwHoleShape.dispose()
			this.screwHoleShape = tempShape
			bodyUpdated = true
			this.dBlockShape && this.dBlockShape.dispose()
			if (this.config.screwHole.flatWidth) {
				this.dBlockShape = this._createFlatSection(this.config.screwHole)

			}
		}
		if (bodyUpdated) {
			if (this.baseShape && this.screwHoleShape) {
				this.bodyShape && this.bodyShape.dispose()
				this.bodyShape = this._performSubstractiveCSG(this.baseShape, this.screwHoleShape, "combined")
			} else {
				this.bodyShape = this.baseShape
			}
		}
	}

	/**
	 * Knob is a combination of body, lips and internal stucture
	 * First create the shape that will make a body
	 * @param {KNOB_BODY} bodyConfig
	 * @returns {BABYLON.Mesh}
	 */
	_createBody(bodyConfig) {
		const shape = /** @type {BABYLON.Vector3[]} */ ([])
		if (!bodyConfig.smoothing) {
			shape.push(...this._createLinearShape(bodyConfig))
		} else {
			const y1 = bodyConfig.height * bodyConfig.balance
			//bottom Section
			const startPoint = new BABYLON.Vector3(bodyConfig.bottomRadius, 0, 0)
			const midPoint = new BABYLON.Vector3(bodyConfig.radius, y1, 0)
			const endPoint = new BABYLON.Vector3(bodyConfig.topRadius, bodyConfig.height, 0)
			const phase1 = this._tessellatePath(startPoint, midPoint, bodyConfig.smoothing, true)
			phase1.pop()
			shape.push(new BABYLON.Vector3(0, 0, 0))
			shape.push(...phase1)
			shape.push(...this._tessellatePath(midPoint, endPoint, bodyConfig.smoothing))
			shape.push(new BABYLON.Vector3(0, bodyConfig.height, 0))
		}
		return BABYLON.MeshBuilder.CreateLathe("baseShape", {
			shape: shape,
			radius: 0,
			tessellation: bodyConfig.sides > 2 ? bodyConfig.sides : null,
			closed: true
		})
	}

	/**
	 * @param {KNOB_SLOT} screwHoleConfig 
	 * @returns {BABYLON.Mesh}
	 */
	_createScrewHole(screwHoleConfig) {
		if (screwHoleConfig && screwHoleConfig.height && screwHoleConfig.bottomRadius) {
			const mesh = BABYLON.MeshBuilder.CreateLathe("screwHoleShape", {
				shape: this._createLinearShape(this.config.screwHole),
				radius: 0,
				tessellation: this.config.screwHole.sides > 2 ?
					this.config.screwHole.sides : null,
				closed: true,
			})
			if (screwHoleConfig.offset)
				mesh.rotateAround(new BABYLON.Vector3(0, 0, 0),
					new BABYLON.Vector3(0, 1, 0), screwHoleConfig.offset)
			return mesh
		}
		return null
	}

	/**
	 * 
	 * @param {KNOB_SLOT} screwHoleConfig 
	 * @returns {BABYLON.Mesh}
	 */
	_createFlatSection(screwHoleConfig) {
		const radius = screwHoleConfig.bottomRadius
		let halfWidth = screwHoleConfig.flatWidth / 2
		halfWidth = Math.min(radius, halfWidth)
		let theta = Math.PI / 2 - Math.asin(halfWidth / radius)
		const theta2 = Math.PI - theta
		console.log(theta, theta2)

		const arcTessellations = 20
		const thetaStep = (theta2 - theta) / arcTessellations
		const points = []
		const radiusOffset = Math.sqrt(radius * radius - halfWidth * halfWidth)
		const centerPoint = new BABYLON.Vector3(0, radiusOffset, 0)
		const direction = new BABYLON.Vector3(0, 0, 0)
		for (let i = 0; i <= arcTessellations; i++) {
			const x = Math.cos(theta)
			const y = Math.sin(theta)
			const point = new BABYLON.Vector3(x, y, 0).scaleInPlace(radius)
			//this so that there is not gap between the block and inner-radius
			point.addInPlace(direction.copyFrom(point).subtractInPlace(centerPoint).normalizeToRef(direction)
				.scaleInPlace(1))
			points.push(point)
			theta += thetaStep
		}

		points.push(points[0].clone())
		const extrudeLength = screwHoleConfig.balance * screwHoleConfig.height
		const mesh1 = BABYLON.MeshBuilder.ExtrudeShape("dBlockShape", {
			shape: points,
			path: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, extrudeLength, 0)],
			cap: BABYLON.Mesh.CAP_ALL
		})
		mesh1.rotation.y = screwHoleConfig.offset
		if (screwHoleConfig.doubleD) {
			const mesh2 = mesh1.clone("dBlockShape2")
			mesh2.rotation.y += Math.PI
			return BABYLON.Mesh.MergeMeshes([mesh1, mesh2], true)
		} else
			return mesh1
	}

	/**
	 * @param {BABYLON.Mesh} a 
	 * @param {BABYLON.Mesh} b
	 * @param {string} name
	 * @returns {BABYLON.Mesh}
	 */
	_performSubstractiveCSG(a, b, name) {
		// Create CSG objects from each mesh
		const outerCSG = BABYLON.CSG.FromMesh(a)
		const innerCSG = BABYLON.CSG.FromMesh(b)
		const pipeCSG = outerCSG.subtract(innerCSG)
		const mKnob = pipeCSG.toMesh(name, null, this.scene)
		this.scene.removeMesh(a)
		this.scene.removeMesh(b)
		mKnob.convertToFlatShadedMesh()
		return mKnob
	}

	/**
	 * @param {BABYLON.Vector3} startPoint 
	 * @param {BABYLON.Vector3} endPoint 
	 * @param {number} smoothing
	 * @param {boolean} [opposite]
	 * @returns {BABYLON.Vector3[]}
	 */
	_tessellatePath(startPoint, endPoint, smoothing, opposite) {
		const path = /** @type {BABYLON.Vector3[]} */ ([])
		const distance = BABYLON.Vector3.Distance(startPoint, endPoint)
		const subDivisions = Math.round(distance * TESELLATION)
		let yPos = startPoint.y
		const yIncrement = (endPoint.y - startPoint.y) / subDivisions
		const xDiff = endPoint.x - startPoint.x
		let position = 0
		const step = 1 / subDivisions
		const factor = 1 + (smoothing * 2)
		for (let i = 0; i <= subDivisions; i++) {
			const point = new BABYLON.Vector3(0, 0, 0)
			let xPosition = opposite ? 1 - Math.pow(1 - position, factor) : Math.pow(position, factor)
			point.x = startPoint.x + (xDiff * xPosition)
			point.y = yPos
			yPos += yIncrement
			path.push(point)
			position += step
		}
		return path
	}

	/**
	 * @param {KNOB_BODY_OPTIONS} config 
	 * @returns {BABYLON.Vector3[]}
	 */
	_createLinearShape(config) {
		return [
			new BABYLON.Vector3(0, 0, 0),
			new BABYLON.Vector3(config.bottomRadius, 0, 0),
			new BABYLON.Vector3(config.radius, config.height * config.balance, 0),
			new BABYLON.Vector3(config.topRadius, config.height, 0),
			new BABYLON.Vector3(0, config.height, 0)
		]
	}

	/**
	 * @param {KNOB_POINTER} config 
	 * @returns {BABYLON.Mesh}
	 */
	_createPointer(config) {
		if (!config || !config.height)
			return null

		/**
		 * @param {number} angle 
		 * @param {number} radius 
		 * @returns {BABYLON.Vector3}
		 */
		function getPointAt(angle, radius) {
			return new BABYLON.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
		}

		const p1 = getPointAt(config.offset + config.widthStart / 2, config.rStart)
		const p2 = getPointAt(config.offset - config.widthStart / 2, config.rStart)
		const p3 = getPointAt(config.offset - config.widthEnd / 2, config.rEnd)
		const p4 = getPointAt(config.offset + config.widthEnd / 2, config.rEnd)
		const y = (this.config.body.height * config.position) - (config.height / 2)

		return BABYLON.MeshBuilder.ExtrudeShape("knobPointer", {
			shape: [p1, p2, p3, p4, p1.clone()],
			path: [
				new BABYLON.Vector3(0, y, 0),
				new BABYLON.Vector3(0, y + config.height, 0)
			],
			closePath: true,
			cap: BABYLON.Mesh.CAP_ALL
		})
	}

	dispose() {
		this.baseShape.dispose()
		this.screwHoleShape && this.screwHoleShape.dispose()
		this.bodyShape.dispose()
		this.dBlockShape && this.dBlockShape.dispose()
		this.pointerShape && this.pointerShape.dispose()
	}

	exportSTL() {
		//@ts-ignore
		BABYLON.STLExport.CreateSTL(this.scene.meshes, true, "knob", false, false)
	}
}