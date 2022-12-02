import * as BABYLON from "../node_modules/babylonjs/babylon.js"
import "../node_modules/babylonjs-serializers/babylonjs.serializers.module.js"

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
			if (bodyConfig.balance == undefined)
				bodyConfig.balance = 0.5
		}

		fillDefaultsOnBody(this.config.body)
		if ("screwHole" in this.config) {
			fillDefaultsOnBody(this.config.screwHole)
			if (this.config.screwHole.balance == undefined)
				this.config.screwHole.balance = 1
			if (this.config.screwHole.bottomRadius == undefined)
				this.config.screwHole.bottomRadius = this.config.screwHole.radius
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
			this.baseShape = this._createBody(config.body)
			bodyUpdated = true
		}
		if (partsToUpdate.indexOf("screwHole") + 1) {
			Object.assign(this.config.screwHole, config.screwHole)
			const tempShape = this._createScrewHole(config.screwHole)
			this.screwHoleShape && this.screwHoleShape.dispose()
			this.screwHoleShape = tempShape
			bodyUpdated = true
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
		this.pointerShape && this.pointerShape.dispose()
	}

	exportSTL() {
		//@ts-ignore
		BABYLON.STLExport.CreateSTL(this.scene.meshes, true, "knob", false, false)
	}
}