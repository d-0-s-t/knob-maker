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

/**
 * @typedef {object} SEGMENT
 * @property {number} radius
 * @property {number} height ratio of 0 - 1 of profiles height
 * @property {number} [smoothing]
 */

/**
 * @typedef {object} KNOB_BODY_CONFIG
 * @property {number} height
 * @property {number} [sides]
 * @property {SEGMENT[]} segments Atleast one segment is needed.
 * This defines the radius of the shape. Also the segments must be
 * sorted before a profile can be made
 */

/**
 * @typedef {object} KNOB_POINTER_CONFIG
 * @property {number} length
 * @property {number} height
 * @property {number} [angle]
 * @property {number} [position]
 * @property {number} [radialOffset]
 * @property {number} [widthStart] In radians
 * @property {number} [widthEnd] In radian
 */

/**
 * @typedef {object} ONLY_KNOB_SLOT
 * @property {number} [angle]
 * @property {SPLINE_CONFIG[]} [splines]
 * @property {THREAD_CONFIG[]} [threads]
 * @typedef {KNOB_BODY_CONFIG & ONLY_KNOB_SLOT} KNOB_HOLE_CONFIG
 */

/**
 * @typedef {object} KNOB_CONFIG
 * @property {KNOB_BODY_CONFIG} body
 * @property {KNOB_POINTER_CONFIG[]} [pointers]
 * @property {KNOB_HOLE_CONFIG} [screwHole]
 * @property {SURFACE_CONFIG} [surface]
 */

/**
 * @typedef {object} SURFACE_CONFIG
 * @property {KNURLING_CONFIG[]} [knurling]
 * @property {SPLINE_CONFIG[]} [splines]
 * @property {THREAD_CONFIG[]} [threads]
 */

/**
 * @typedef {object} KNURLING_CONFIG
 * @property {"pyramid"|"rectangle"|"cylinder"|"cone"|"triangle"} [shape]
 * @property {number} sizeX
 * @property {number} sizeY
 * @property {number} depth
 * @property {number} radialCount
 * @property {number} [verticalSpacing]
 * @property {number} [verticalOffset] 
 * @property {number} [rise]
 * @property {number[]} [range]
 * @property {number} [shapeRotation]
 * @property {number} [depthSmoothing]
 */

/**
 * @typedef {object} SPLINE_CONFIG
 * @property {number} count
 * @property {number[]} range
 * @property {number} height the height of the tooth radially.
 * @property {number} [width] width the width property present, the shape becomes a
 * key slot
 * @property {number} [thickness]
 * @property {number} [rootThickness]
 * @property {number} [smoothing]
 * @property {number} [topScale=1]
 * @property {number} [bottomScale=1]
 * @property {number} [scaleSmoothing=0]
 * @property {number} [angle=0]
 * @property {number} [angleSmoothing=0]
 * @property {boolean} [substractive=false]
 */

/**
 * @typedef {object} THREAD_CONFIG
 * @property {number} pitch
 * @property {number} depth 
 * @property {boolean} [leftHanded]
 * @property {number[]} range
 */

/**
 * @typedef {keyof KNOB_CONFIG|"knurling"|"splines"|"internalSplines"|"threads"|"internalThreads"} UpdateKey
 */

/** one per millimeter */
const TESELLATION = 2

/**
 * @typedef {BABYLON.Mesh|BABYLON.InstancedMesh} Mesh
 */

export class KNOB {

	/**
	 * @param {KNOB_CONFIG} config 
	 * @param {BABYLON.Scene} scene 
	 * @param {boolean} [draftMode] Doesn't combine meshes and doesn't perform CSG.
	 * Meshes will be transuncent to see through. This is mainly for performance reasons
	 */
	constructor(config, scene, draftMode) {
		/** @type {KNOB_CONFIG} */
		this.config = JSON.parse(JSON.stringify(config))
		this.scene = scene
		this.knurlingMeshes = /** @type {Mesh[]} */ ([])
		this.surfaceSplines = /** @type {Mesh[]} */ ([])
		this.surfaceThreads = /** @type {Mesh[]} */ ([])
		this.screwHoleThreads = /** @type {Mesh[]} */ ([])
		this.screwHoleSplines = /** @type {Mesh[]} */ ([])
		this.pointers = /** @type {Mesh[]} */ ([])
		this.draftMode = !!draftMode
		this.substractionMeshes = /** @type {Mesh[]} */ ([])
		/** @type {BABYLON.Mesh} */
		this.finalShape
		this.update(config)
	}

	/**
	 * @param {KNOB_CONFIG} config
	 * @param {UpdateKey[]} [partsToUpdate] 
	 * @param {number} [index]
	 */
	update(config, partsToUpdate, index) {
		if (!partsToUpdate || partsToUpdate.length == 0)
			partsToUpdate = [
				"body", "pointers", "screwHole",
				"knurling", "splines", "threads",
			]

		let bodyUpdated = false
		if (partsToUpdate.indexOf("body") + 1) {
			this.disposeMesh(this.bodyShape)
			Object.assign(this.config.body, config.body)
			this.config.body.segments.sort((a, b) => a.height - b.height)
			this.bodyShape = this._createBody(this.config.body)
			partsToUpdate.push("surface")
			partsToUpdate.push("screwHole")
			bodyUpdated = true
		}
		if (partsToUpdate.indexOf("screwHole") + 1) {
			Object.assign(this.config.screwHole, config.screwHole)
			this.config.screwHole.segments.sort((a, b) => a.height - b.height)
			const tempShape = this._createScrewHole(this.config.screwHole)
			this.disposeMesh(this.screwHoleShape)
			this.screwHoleShape = tempShape
			if (this.screwHoleShape)
				this.addForSubstraction(this.screwHoleShape)

			partsToUpdate.push("internalSplines")
			partsToUpdate.push("internalThreads")
		}
		if (partsToUpdate.indexOf("surface") + 1) {
			partsToUpdate.push("knurling")
			partsToUpdate.push("splines")
			partsToUpdate.push("threads")
		}

		/**
		 * @typedef {object} ARRAY_CONFIG
		 * @property {any} parent
		 * @property {(c:*) => Mesh} creator
		 * @property {Mesh[]} stash
		 * @property {any} source
		 * @property {string} [key]
		 */

		/**
		 * @typedef {"pointers"|"splines"|"knurling"|"internalSplines"|"threads"|"internalThreads"} arrayTypeIndices
		 */

		/**
		 * @type {{[key in arrayTypeIndices]: ARRAY_CONFIG}}
		 */
		const ARR_CONFIGS = {
			"pointers": {
				"parent": /** @type {any} */ (this.config),
				"creator": (c) => this._createPointer(c),
				"stash": this.pointers,
				"source": config.pointers
			},
			"splines": {
				"parent": this.config.surface,
				"creator": (c) => this._createRibbonOn(this.bodyProfile, c),
				"stash": this.surfaceSplines,
				"source": config.surface.splines
			},
			"knurling": {
				"parent": this.config.surface,
				"creator": (c) => this._createKnurling(c),
				"stash": this.knurlingMeshes,
				"source": config.surface.knurling
			},
			"internalSplines": {
				"parent": this.config.screwHole,
				"creator": (c) => this._createRibbonOn(this.screwHoleProfile, c, true),
				"stash": this.screwHoleSplines,
				"source": config.screwHole.splines,
				"key": "splines"
			},
			"threads": {
				"parent": this.config.surface,
				"creator": (c) => this._createThreadsOnProfile(this.bodyProfile, c),
				"stash": this.surfaceThreads,
				"source": config.surface.threads
			},
			"internalThreads": {
				"parent": this.config.screwHole,
				"creator": (c) => this._createThreadsOnProfile(this.screwHoleProfile, c, true),
				"stash": this.screwHoleThreads,
				"source": config.screwHole.threads
			},

		}

		const _this = this
		Object.keys(ARR_CONFIGS).forEach(( /** @type {arrayTypeIndices} */ key) => {
			if (partsToUpdate.indexOf(key) + 1) {
				const creatorInfo = ARR_CONFIGS[key]
				const configKey = creatorInfo.key || key
				if (index == undefined || !creatorInfo.parent[configKey][index]) {
					creatorInfo.parent[configKey] = JSON.parse(JSON.stringify(creatorInfo.source))
					creatorInfo.stash.forEach(mesh => _this.disposeMesh(mesh))
					creatorInfo.stash.length = 0
					creatorInfo.stash.push(...creatorInfo.parent[configKey]
						//@ts-ignore
						.map(c => creatorInfo.creator(c)))
				} else {
					Object.assign(creatorInfo.parent[configKey][index], creatorInfo.source[index])
					_this.disposeMesh(creatorInfo.stash[index])
					creatorInfo.stash[index] = creatorInfo.creator(creatorInfo.parent[configKey][index])
				}
			}
		})

		if (bodyUpdated || this.substractionSetUpdated) {
			if (!this._performSubstraction()) {
				this.finalShape = this.bodyShape
				this.bodyShape.convertToFlatShadedMesh()
				this.scene.addMesh(this.bodyShape)
			}
		}

		//for debugging
		console.log("Mesh Count:" + this.scene.meshes.length)
	}

	/**
	 * Knob is a combination of body, lips and internal stucture
	 * First create the shape that will make a body
	 * @param {KNOB_BODY_CONFIG} bodyConfig
	 * @returns {BABYLON.Mesh}
	 */
	_createBody(bodyConfig) {
		if (bodyConfig.sides < 3)
			delete bodyConfig.sides

		this.bodyProfile = new Profile(bodyConfig, true)
		return BABYLON.MeshBuilder.CreateLathe("baseShape", {
			shape: this.bodyProfile.shape,
			radius: 0,
			tessellation: bodyConfig.sides > 2 ? bodyConfig.sides : null,
			closed: true
		})
	}

	/**
	 * @param {KNOB_HOLE_CONFIG} screwHoleConfig 
	 * @returns {BABYLON.Mesh}
	 */
	_createScrewHole(screwHoleConfig) {
		if (screwHoleConfig && screwHoleConfig.segments.length) {
			if (screwHoleConfig.height == undefined)
				screwHoleConfig.height = this.bodyProfile.height
			if (screwHoleConfig.sides < 3)
				delete screwHoleConfig.sides
			if (screwHoleConfig.angle == undefined)
				screwHoleConfig.angle = 0

			this.screwHoleProfile = new Profile(screwHoleConfig)
			if (!this.screwHoleProfile.length) {
				this.screwHoleProfile = null
				return null
			}
			const mesh = BABYLON.MeshBuilder.CreateLathe("screwHoleShape", {
				shape: this.screwHoleProfile.shape,
				radius: 0,
				tessellation: this.config.screwHole.sides > 2 ?
					this.config.screwHole.sides : null,
				closed: true,
			})
			if (screwHoleConfig.angle)
				mesh.rotateAround(new BABYLON.Vector3(0, 0, 0),
					new BABYLON.Vector3(0, 1, 0), screwHoleConfig.angle)
			return mesh
		}
		return null
	}

	/**
	 * fortunately for us, all meshes subtract from the main body
	 * @returns {boolean}
	 */
	_performSubstraction() {
		if (this.finalShape && this.finalShape != this.bodyShape)
			this.disposeMesh(this.finalShape)

		this.substractionSetUpdated = false
		if (!this.substractionMeshes.length) {
			return false
		} else {
			let outerCSG = BABYLON.CSG.FromMesh(this.bodyShape)
			this.scene.removeMesh(this.bodyShape)
			for (let i = 0; i < this.substractionMeshes.length; i++) {
				const mesh = this.substractionMeshes[i]
				const innerCSG = BABYLON.CSG.FromMesh(mesh)
				this.scene.removeMesh(mesh)
				outerCSG = outerCSG.subtract(innerCSG)
			}
			this.finalShape = outerCSG.toMesh("finalShape", null, this.scene)
			this.finalShape.convertToFlatShadedMesh()
		}
		return true
	}

	/**
	 * @param {KNOB_POINTER_CONFIG} config 
	 * @returns {BABYLON.Mesh}
	 */
	_createPointer(config) {
		if (!config || !config.height)
			return null

		if (config.angle == undefined)
			config.angle = 0
		if (config.radialOffset == undefined)
			config.radialOffset = 0
		if (config.position == undefined)
			config.position = 0
		if (config.widthEnd == undefined)
			config.widthEnd = 0
		if (config.widthStart == undefined)
			config.widthStart = Math.PI / 10

		const p1 = getPointAt(config.angle - config.widthStart / 2, config.radialOffset)
		const p2 = getPointAt(config.angle + config.widthStart / 2, config.radialOffset)
		const p3 = getPointAt(config.angle + config.widthEnd / 2, config.radialOffset + config.length)
		const p4 = getPointAt(config.angle - config.widthEnd / 2, config.radialOffset + config.length)

		const y = (this.bodyProfile.height * config.position) - (config.height / 2)

		const mesh = BABYLON.MeshBuilder.ExtrudeShape("knobPointer", {
			shape: [p1, p2, p3, p4, p1.clone()],
			path: [
				new BABYLON.Vector3(0, y, 0),
				new BABYLON.Vector3(0, y + config.height, 0)
			],
			cap: BABYLON.Mesh.CAP_ALL
		})
		mesh.convertToFlatShadedMesh()
		return mesh
	}

	/**
	 * @param {KNURLING_CONFIG} config
	 * @returns {Mesh}
	 */
	_createKnurling(config) {
		if (!(config.sizeX && config.sizeY && config.depth))
			return null
		/** @type {BABYLON.Mesh} */
		let baseMesh
		if (!config.shape)
			config.shape = "pyramid"
		if (config.verticalOffset == undefined)
			config.verticalOffset = 0
		if (config.verticalSpacing == undefined)
			config.verticalSpacing = 0
		if (config.rise == undefined)
			config.rise = 0.9

		const halfY = config.sizeY / 2
		switch (config.shape) {
			case "cone":
			case "cylinder":
				baseMesh = BABYLON.MeshBuilder.CreateCylinder("baseCylinder", {
					diameter: config.sizeX,
					height: config.depth,
					diameterTop: config.shape == "cone" ? 0 : null,
				})
				baseMesh.setPivotPoint(new BABYLON.Vector3(0, -config.depth / 2, 0), BABYLON.Space.LOCAL)
				baseMesh.rotation.x = Math.PI / 2
				break
			case "rectangle":
				baseMesh = BABYLON.MeshBuilder.CreateBox("baseBox", {
					width: config.sizeX,
					height: config.sizeY,
					depth: config.depth
				})
				baseMesh.rotation.z = config.shapeRotation || 0
				break
			case "triangle":
				baseMesh = BABYLON.MeshBuilder.ExtrudeShape("baseTraingle", {
					shape: [new BABYLON.Vector3(0, halfY, 0),
						new BABYLON.Vector3(-config.sizeX / 2, -halfY, 0),
						new BABYLON.Vector3(config.sizeX / 2, -halfY, 0)
					],
					closeShape: true,
					path: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, config.depth)],
					cap: BABYLON.Mesh.CAP_ALL
				})
				baseMesh.convertToFlatShadedMesh()
				baseMesh.rotation.z = config.shapeRotation || 0
				break
			case "pyramid": {
				const halfX = config.sizeX / 2
				const knurlingShape = {
					"name": "Square Pyramid (J1)",
					"category": ["Johnson Solid"],
					"vertex": [
						[-halfX, -halfY, 0],
						[-halfX, halfY, 0],
						[halfX, halfY, 0],
						[halfX, -halfY, 0],
						[0, 0, config.depth]
					],
					"face": [
						[1, 4, 2],
						[0, 1, 2],
						[3, 0, 2],
						[4, 3, 2],
						[4, 1, 0, 3]
					]
				}
				baseMesh = BABYLON.MeshBuilder.CreatePolyhedron("basePolyHedra", {
					custom: knurlingShape
				})
				baseMesh.rotation.z = config.shapeRotation || 0
				break
			}
		}

		baseMesh.position.z = this.config.body.segments[0].radius -
			((1 - config.rise) * config.depth)

		if (config.shape == "rectangle")
			baseMesh.position.z += config.depth / 2

		const yDist = config.sizeY + config.verticalSpacing
		config.radialCount = Math.min(200, config.radialCount)
		const radialStep = Math.PI * 2 / config.radialCount
		let angle = 0
		const verticalAxis = new BABYLON.Vector3(0, 1, 0)
		const xAxis = new BABYLON.Vector3(-1, 0, 0)
		const center = BABYLON.Vector3.Zero()
		let meshID = 0
		const parentMesh = new BABYLON.Mesh("knurlingParentMesh")
		/** @type {BABYLON.InstancedMesh} */
		let referenceMesh

		const limitStart = this.bodyProfile.getDistanceAt(config.range[0])
		const limitEnd = this.bodyProfile.getDistanceAt(config.range[1])
		const yPosLimit = limitEnd - halfY
		const halfPoint = (limitStart + limitEnd) / 2
		const smoothingHeight = this.bodyProfile.height * config.depthSmoothing

		for (let j = 0; j < config.radialCount; j++) {
			let slot = 0
			let yPos = limitStart + halfY + ((j * config.verticalOffset) % yDist)
			const scaleMap = /** @type {number[]} */ ([])
			const slopeHeightMap = /** @type {{angle:number,y:number,x:number}[]} */ ([])
			while (yPos <= yPosLimit) {
				while (yPos > this.bodyProfile.lengthMap[slot])
					slot++
				slopeHeightMap.push(this.bodyProfile.getInfoAt(yPos, slot - 1))
				let scale = 1
				if (smoothingHeight) {
					if (yPos < halfPoint)
						scale = Math.min(1, (yPos - limitStart) / smoothingHeight)
					else
						scale = Math.min(1, (limitEnd - yPos) / smoothingHeight)
				}
				scaleMap.push(scale)

				yPos += yDist
			}
			for (let i = 0; i < slopeHeightMap.length; i++) {
				const t = baseMesh.createInstance(baseMesh.name + meshID++)
				t.position.y = slopeHeightMap[i].y
				t.position.z = slopeHeightMap[i].x -
					((1 - config.rise) * config.depth)
				t.rotateAround(
					new BABYLON.Vector3(0, t.position.y, t.position.z),
					xAxis,
					slopeHeightMap[i].angle
				)
				t.rotateAround(center, verticalAxis, angle)
				t.setParent(parentMesh)
				t.scaling.z = scaleMap[i]
				referenceMesh = t
			}
			angle += radialStep
		}

		if (!referenceMesh) {
			parentMesh.dispose()
			baseMesh.dispose()
			return null
		}

		copyTransform(baseMesh, referenceMesh)
		baseMesh.setParent(parentMesh)
		referenceMesh.dispose()

		return parentMesh
	}

	/**
	 * @param {Profile} profile
	 * @param {SPLINE_CONFIG} config
	 * @param {boolean} [internal]
	 * @returns {BABYLON.Mesh}
	 */
	_createRibbonOn(profile, config, internal = false) {
		if (!profile || config.count < 1 || (!config.height && !config.width))
			return null

		const start = profile.getDistanceAt(config.range[0])
		const end = profile.getDistanceAt(config.range[1])

		const absYStart = config.range[0] * profile.height
		const absYEnd = config.range[1] * profile.height

		if (config.topScale == undefined)
			config.topScale = 1
		if (config.bottomScale == undefined)
			config.bottomScale = 1
		if (config.scaleSmoothing == undefined)
			config.scaleSmoothing = 0
		if (config.angle == undefined)
			config.angle = 0
		if (config.angleSmoothing == undefined)
			config.angleSmoothing = 0
		if (config.rootThickness == undefined)
			config.rootThickness = config.thickness

		let oppSmoothing = config.scaleSmoothing < 0
		config.scaleSmoothing = Math.abs(config.scaleSmoothing)
		let oppAngleSmoothing = config.angleSmoothing < 0
		config.angleSmoothing = Math.abs(config.angleSmoothing)

		const tessellations = Math.ceil((end - start) * TESELLATION)
		const distanceStep = (end - start) / tessellations
		let currentD = start
		const midSection = (absYEnd + absYStart) / 2
		const shapes = []
		const angleStep = Math.abs(config.angle / tessellations)
		let pathRotation = 0

		const shapeFn = config.width ? this._createKeyProfile : this._createSplineProfile
		const isInward = !internal != !config.substractive

		for (let i = 0; i <= tessellations; i++) {
			const dInfo = profile.getInfoAt(currentD)
			let dScale = 1
			if (dInfo.y >= midSection) {
				const ratio = (dInfo.y - midSection) / (absYEnd - midSection)
				dScale += (config.topScale - 1) * smooth(ratio, config.scaleSmoothing, oppSmoothing)
			} else {
				const ratio = (dInfo.y - midSection) / (absYStart - midSection)
				dScale += (config.bottomScale - 1) * smooth(ratio, config.scaleSmoothing, oppSmoothing)
			}
			currentD += distanceStep

			const currentAngle = config.angle * smooth(pathRotation,
				config.angleSmoothing,
				oppAngleSmoothing)
			pathRotation += angleStep

			shapes[i + 1] = shapeFn({
				rootThickness: config.rootThickness * dScale,
				tipThickness: config.thickness * dScale,
				height: config.height * dScale,
				radius: dInfo.x,
				smoothing: config.smoothing,
				yPos: dInfo.y,
				offset: currentAngle,
				width: config.width * dScale,
				inward: isInward
			})
		}

		shapes[0] = centerArr(shapes[1])
		shapes.push(centerArr(shapes[shapes.length - 1]))

		const baseMesh = BABYLON.MeshBuilder.CreateRibbon("baseSplineStructure" + Math.random(), {
			pathArray: shapes,
			sideOrientation: isInward ? null : BABYLON.Mesh.BACKSIDE
		})

		const radialStep = 2 * Math.PI / config.count
		let currentAngle = 0
		const verticalAxis = new BABYLON.Vector3(0, 1, 0)
		const zero = new BABYLON.Vector3(0, 0, 0)
		for (let i = 1; i < config.count; i++) {
			currentAngle += radialStep
			const instance = baseMesh.createInstance(baseMesh.name + i)
			instance.rotateAround(zero, verticalAxis, currentAngle)
			instance.setParent(baseMesh)
		}

		if (config.substractive)
			this.addForSubstraction(baseMesh)
		else
			baseMesh.convertToFlatShadedMesh()

		return baseMesh
	}

	/**
	 * @typedef {object} Surface_Shape_Config
	 * @property {number} radius
	 * @property {number} height
	 * @property {number} yPos
	 * @property {number} [width]
	 * @property {number} [offset] Angular offset
	 * @property {number} [smoothing]
	 * @property {number} [rootThickness]
	 * @property {number} [tipThickness]
	 * @property {boolean} [inward]
	 */

	/**
	 * @param {Surface_Shape_Config} c
	 * @returns {BABYLON.Vector3[]}
	 */
	_createSplineProfile(c) {
		/** 3 every mm */
		//const tessellations = 3
		const profile = /** @type {BABYLON.Vector3[]} */ ([])

		/**
		 * @param {number} angle 
		 * @param {number} r 
		 * @returns {BABYLON.Vector3}
		 */
		function getPointAtMod(angle, r) {
			const p = getPointAt(angle, r)
			p.z = p.y
			p.y = c.yPos
			return p
		}

		const numBasePoints = 18 //Math.round(r * rb * tessellations)
		let arcStep = c.rootThickness / numBasePoints
		let currentStep = -c.rootThickness / 2 + c.offset
		const h = c.inward ? -c.height : c.height

		for (let i = 0; i <= numBasePoints; i++) {
			let correctedR = c.radius
			//This so that there is no gap between the surface and the spline structure
			if (i % numBasePoints != 0)
				correctedR = c.radius + ((h > 0 ? -c.radius : c.radius) / 10)
			profile.push(getPointAtMod(currentStep, correctedR))
			currentStep += arcStep
		}

		const numSidePoints = 18 //Math.round(r * (Math.abs(rt - rb) / 2) * tessellations)
		arcStep = (c.tipThickness - c.rootThickness) / (2 * numSidePoints)
		currentStep = (c.rootThickness / 2) + c.offset
		let currentHeight = 0
		const heightStep = h / numSidePoints
		const oppDir = c.smoothing > 0 ? false : true
		c.smoothing = Math.abs(c.smoothing) || 0
		for (let i = 0; i < numSidePoints - 1; i++) {
			currentStep += arcStep
			currentHeight += heightStep
			const ch = h * smooth(currentHeight / h, c.smoothing, oppDir)
			profile.push(getPointAtMod(currentStep, c.radius + ch))
		}

		const numTipPoints = 18 //Math.round((r + h) * rt * tessellations)
		arcStep = -c.tipThickness / numTipPoints
		currentStep = (c.tipThickness / 2) + c.offset
		for (let i = 0; i <= numTipPoints; i++) {
			profile.push(getPointAtMod(currentStep, c.radius + h))
			currentStep += arcStep
		}

		arcStep = -(c.tipThickness - c.rootThickness) / (2 * numSidePoints)
		currentStep = -(c.tipThickness / 2) + c.offset
		currentHeight = h
		for (let i = 0; i < numSidePoints - 1; i++) {
			currentStep -= arcStep
			currentHeight -= heightStep
			const ch = h * smooth(currentHeight / h, c.smoothing, oppDir)
			profile.push(getPointAtMod(currentStep, c.radius + ch))
		}

		profile.push(profile[0].clone())
		return profile
	}

	/**
	 * Key is similar to Spline profile except that the width is constant radially extending outward
	 * @param {Surface_Shape_Config} c
	 * @returns {BABYLON.Vector3[]}
	 */
	_createKeyProfile(c) {
		const profile = /** @type {BABYLON.Vector3[]} */ ([])

		/**
		 * @param {number} t 
		 * @param {number} r 
		 * @returns {BABYLON.Vector3}
		 */
		const getPoint = (t, r) => new BABYLON.Vector3(Math.sin(t) * r, c.yPos, Math.cos(t) * r)

		c.width = Math.min(c.width, c.radius * 2)
		const hw = c.width / 2

		const theta = Math.PI / 2 - Math.asin(hw / c.radius)
		const theta2 = Math.PI - theta
		const numBasePoints = 18 //Math.round(r * rb * tessellations)
		let arcStep = (theta2 - theta) / numBasePoints
		let currentStep = theta
		for (let i = 0; i <= numBasePoints; i++) {
			let correctedR = c.radius
			//This so that there is no gap between the surface and the spline structure
			if (i % numBasePoints != 0)
				correctedR += ((c.inward ? c.radius : -c.radius) / 10)
			profile.push(getPoint(currentStep, correctedR))
			currentStep += arcStep
		}

		let h = c.height || 0
		if (c.inward)
			h = -Math.max(h, c.radius - Math.sqrt((c.radius * c.radius) - (hw * hw)))

		const zPosMax = profile[profile.length - 1].z
		profile.push(new BABYLON.Vector3((c.radius + h), c.yPos, zPosMax))
		profile.push(new BABYLON.Vector3((c.radius + h), c.yPos, -zPosMax))

		profile.push(profile[0].clone())
		return profile
	}

	/**
	 * @param {Profile} profile 
	 * @param {THREAD_CONFIG} config 
	 * @param {boolean} [internal] 
	 * @returns {BABYLON.Mesh}
	 */
	_createThreadsOnProfile(profile, config, internal) {
		if (!profile || !config.pitch || config.depth === 0)
			return null

		const fcsh = config.pitch / 16
		const adjustment = config.pitch / 2 - fcsh
		const absYStart = profile.getInfoAt((profile.getDistanceAt(config.range[0]) + adjustment)).y
		const absYEnd = profile.getInfoAt((profile.getDistanceAt(config.range[1]) - adjustment)).y

		const depth = config.depth || config.pitch * 5 * Math.sqrt(3) / 16

		//tessellation on each turn will depend upon radius at height
		let currentY = absYStart
		const paths = /** @type {BABYLON.Vector3[][]} */ ([])
		let currentAngle = 0
		let yStep, radialStep, angleStep, currentRadius, tessellations, currentStep = 0
		let pathIndex = 1
		while (currentY < absYEnd) {
			if (currentStep == 0) {
				const infoStep1 = profile.getInfoAt(currentY)
				const infoStep2 = profile.getInfoAt(currentY + config.pitch)
				const mean = (infoStep1.x + infoStep2.x) / 2
				tessellations = Math.round(2 * Math.PI * mean * TESELLATION)
				yStep = config.pitch / tessellations
				radialStep = (infoStep2.x - infoStep1.x) / tessellations
				angleStep = 2 * Math.PI / tessellations
				currentRadius = infoStep1.x
				if (config.leftHanded) {
					angleStep = -angleStep
					currentAngle = 2 * Math.PI
				} else
					currentAngle = 0
			}

			const point = getPointAt(currentAngle, currentRadius)
			point.z = point.y
			point.y = currentY
			paths[pathIndex++] = this._createThreadProfile(config.pitch, depth,
				currentRadius, currentAngle, currentY, internal)
			currentY += yStep
			currentRadius += radialStep
			currentAngle += angleStep
			currentStep += 1

			if (currentStep == tessellations)
				currentStep = 0
		}

		paths[0] = centerArr(paths[1])
		paths[pathIndex] = centerArr(paths[pathIndex - 1])

		const threads = BABYLON.MeshBuilder.CreateRibbon("thread", {
			pathArray: paths,
			sideOrientation: !config.leftHanded != !internal ? BABYLON.Mesh.BACKSIDE : BABYLON.Mesh.DEFAULTSIDE
		})
		threads.convertToFlatShadedMesh()
		return threads
	}

	/**
	 * @param {number} pitch
	 * @param {number} depth
	 * @param {number} br base Radius
	 * @param {number} angle
	 * @param {number} yPos
	 * @param {boolean} [internal] 
	 * @returns {BABYLON.Vector3[]}
	 */
	_createThreadProfile(pitch, depth, br, angle, yPos, internal) {
		const path = /** @type {BABYLON.Vector3[]} */ ([])
		const directionPoint = new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle))

		const direction = internal ? -1 : 1
		const fcsh = pitch / 16
		const frs = pitch / 4
		const ascentLength = (pitch - (fcsh * 2) - frs) / 2

		let y = yPos - (pitch / 2) + fcsh
		const point1 = directionPoint.scale(br)
		point1.y = y
		y += ascentLength
		const point2 = directionPoint.scale((br + (direction * depth)))
		point2.y = y
		y += frs
		const point3 = point2.clone()
		point3.y = y
		y += ascentLength
		const point4 = point1.clone()
		point4.y = y
		path.push(point1, point2, point3, point4, point1.clone())

		return path
	}

	dispose() {
		this.disposeMesh(this.finalShape)
		this.disposeMesh(this.screwHoleShape)
		this.disposeMesh(this.bodyShape)
		const _this = this
		this.surfaceSplines.forEach(mesh => _this.disposeMesh(mesh))
		this.screwHoleSplines.forEach(mesh => _this.disposeMesh(mesh))
		this.knurlingMeshes.forEach(mesh => _this.disposeMesh(mesh))
		this.pointers.forEach(mesh => _this.disposeMesh(mesh))
		this.surfaceThreads.forEach(mesh => _this.disposeMesh(mesh))
		this.screwHoleThreads.forEach(mesh => _this.disposeMesh(mesh))
	}

	/**
	 * @param {Mesh} mesh 
	 */
	disposeMesh(mesh) {
		if (!mesh)
			return

		mesh.dispose()

		if (this.substractionMeshes.length) {
			const indexInSubstractionList = this.substractionMeshes.indexOf(mesh)
			if (indexInSubstractionList != -1) {
				this.substractionMeshes.splice(indexInSubstractionList, 1)
				this.substractionSetUpdated = true
			}
		}
	}

	/**
	 * @param {Mesh} mesh
	 */
	addForSubstraction(mesh) {
		this.substractionMeshes.push(mesh)
		const _this = this
		mesh.getChildMeshes().forEach(( /** @type {Mesh} */ mesh) => _this.addForSubstraction(mesh))
		this.substractionSetUpdated = true
	}

	/**
	 * Altered from babylonJSSerializer's ExportSTL because 
	 * that doesn't support Instanced Meshes
	 * @param {boolean} [download]
	 * @returns {string} The stl as plain string
	 */
	exportSTL(download) {
		/**
		 * @param {BABYLON.IndicesArray} indices
		 * @param {BABYLON.FloatArray} vertices
		 * @param {number} i
		 * @returns {{v: BABYLON.Vector3[], n: BABYLON.Vector3}}
		 */
		let getFaceData = function(indices, vertices, i) {
			let id = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3]
			let v = [
				new BABYLON.Vector3(vertices[id[0]], vertices[id[0] + 2], vertices[id[0] + 1]),
				new BABYLON.Vector3(vertices[id[1]], vertices[id[1] + 2], vertices[id[1] + 1]),
				new BABYLON.Vector3(vertices[id[2]], vertices[id[2] + 2], vertices[id[2] + 1]),
			]
			let p1p2 = v[0].subtract(v[1])
			let p3p2 = v[2].subtract(v[1])
			let n = BABYLON.Vector3.Cross(p3p2, p1p2).normalize()
			return { v: v, n: n }
		}

		let data

		data = "solid stlmesh\r\n"
		for (let i = 0; i < this.scene.meshes.length; i++) {
			let mesh = this.scene.meshes[i]
			let vertices = getTransformedVertices(mesh)
			if (!vertices.length)
				continue

			let indices = mesh.getIndices() || []
			for (let i_1 = 0; i_1 < indices.length; i_1 += 3) {
				let fd = getFaceData(indices, vertices, i_1)
				data += "facet normal " + fd.n.x + " " + fd.n.y + " " + fd.n.z + "\r\n"
				data += "\touter loop\r\n"
				data += "\t\tvertex " + fd.v[0].x + " " + fd.v[0].y + " " + fd.v[0].z + "\r\n"
				data += "\t\tvertex " + fd.v[1].x + " " + fd.v[1].y + " " + fd.v[1].z + "\r\n"
				data += "\t\tvertex " + fd.v[2].x + " " + fd.v[2].y + " " + fd.v[2].z + "\r\n"
				data += "\tendloop\r\n"
				data += "endfacet\r\n"
			}
		}

		data += "endsolid stlmesh"

		if (download) {
			let a = document.createElement("a")
			let blob = new Blob([data], { type: "application/octet-stream" })
			a.href = window.URL.createObjectURL(blob)
			a.download = "knob.stl"
			a.click()
		}
		return data
	}
}

/**
 * 
 * @param {BABYLON.AbstractMesh} mesh 
 * @returns {BABYLON.FloatArray}
 */
function getTransformedVertices(mesh) {
	let sourceMesh = mesh
	if (mesh.constructor == BABYLON.InstancedMesh)
		sourceMesh = mesh._sourceMesh
	let data = sourceMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind, true, true)
	if (!data)
		return []
	let temp = BABYLON.Vector3.Zero()
	let index
	for (index = 0; index < data.length; index += 3) {
		BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(data[index], data[index + 1], data[index + 2], mesh.computeWorldMatrix(true), temp)
			.toArray(data, index)
	}
	return data
}

/**
 * @param {BABYLON.Mesh|BABYLON.InstancedMesh} targetMesh 
 * @param {BABYLON.Mesh|BABYLON.InstancedMesh} sourceMesh 
 */
function copyTransform(targetMesh, sourceMesh) {
	targetMesh.rotation.copyFrom(sourceMesh.rotation)
	if (sourceMesh.rotationQuaternion) {
		if (!targetMesh.rotationQuaternion)
			targetMesh.rotationQuaternion = new BABYLON.Quaternion(0, 0, 0, 1)
		targetMesh.rotationQuaternion.copyFrom(sourceMesh.rotationQuaternion)
	}
	targetMesh.position.copyFrom(sourceMesh.position)
	targetMesh.scaling.copyFrom(sourceMesh.scaling)
}

/**
 * @param {number} angle 
 * @param {number} radius 
 * @returns {BABYLON.Vector3}
 */
function getPointAt(angle, radius) {
	return new BABYLON.Vector3(Math.sin(angle) * radius, Math.cos(angle) * radius, 0)
}

/**
 * @param {BABYLON.Vector3[]} arr 
 * @returns {BABYLON.Vector3[]}
 */
function centerArr(arr) {
	let newArr = []
	let barycenter = new BABYLON.Vector3(0, 0, 0)
	let i
	for (i = 0; i < arr.length; i++) {
		barycenter.addInPlace(arr[i])
	}
	barycenter.scaleInPlace(1.0 / arr.length)
	for (i = 0; i < arr.length; i++) {
		newArr.push(barycenter)
	}
	return newArr
}

class Profile {
	/**
	 * @param {KNOB_BODY_CONFIG} config 
	 * @param {boolean} [fullLength]
	 */
	constructor(config, fullLength) {
		let segments = /** @type {SEGMENT[]} */ ([])
		if (config.segments.length == 1) {
			segments.push({ height: 0, radius: config.segments[0].radius, smoothing: 0 })
			segments.push({ height: fullLength ? 1 : config.segments[0].height, radius: config.segments[0].radius, smoothing: 0 })
		} else {
			if (fullLength && config.segments[0].height != 0)
				segments.push({ height: 0, smoothing: 0, radius: config.segments[0].radius })
			segments.push(...config.segments)
			const lastSegment = config.segments[config.segments.length - 1]
			if (fullLength && lastSegment.height != 1)
				segments.push({ height: 1, smoothing: 0, radius: lastSegment.radius })
		}

		this.shape = /** @type {BABYLON.Vector3[]} */
			([new BABYLON.Vector3(0, segments[0].height * config.height, 0)])
		this.side = /** @type {BABYLON.Vector3[]} */ ([])
		for (let i = 0; i < segments.length - 1; i++) {
			const start = segments[i]
			const end = segments[i + 1]
			const h1 = start.height * config.height
			const h2 = end.height * config.height
			const startPoint = new BABYLON.Vector3(start.radius, h1, 0)
			const endPoint = new BABYLON.Vector3(end.radius, h2, 0)
			if (start.smoothing) {
				this.side.push(...this._tessellatePath(startPoint,
					endPoint, Math.abs(start.smoothing),
					start.smoothing < 0))
			} else {
				this.side.push(startPoint)
				this.side.push(endPoint)
			}
		}

		this.shape.push(...this.side)
		const lastSegment = segments[segments.length - 1]
		this.shape.push(new BABYLON.Vector3(0, lastSegment.height * config.height, 0))

		this.lengthMap = [0]
		let distance = 0
		for (let i = 1; i < this.side.length; i++) {
			distance += BABYLON.Vector3.Distance(this.side[i], this.side[i - 1])
			this.lengthMap.push(distance)
		}
		this.height = this.side[this.side.length - 1].y - this.side[0].y
		this.length = distance
	}

	/**
	 * Start and EndPoints themselves are not included
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
		const step = 1 / subDivisions
		let position = 0
		for (let i = 0; i <= subDivisions; i++) {
			const point = new BABYLON.Vector3(0, 0, 0)
			point.x = startPoint.x + (xDiff * smooth(position, smoothing, opposite))
			point.y = yPos
			yPos += yIncrement
			path.push(point)
			position += step
		}
		return path
	}

	/**
	 * Returns position and slope at a given distance from the base of the profile.
	 * The distance is measurea along the profile surface
	 * @param {number} distance The linear distance along the profile
	 * @param {number} [slot] 
	 * @returns {{angle:number,y:number,x:number}}
	 */
	getInfoAt(distance, slot) {
		if (slot == undefined) {
			slot = 0
			while (distance >= this.lengthMap[slot])
				slot++
			slot--
			if (slot >= this.lengthMap.length - 1)
				slot = this.lengthMap.length - 2
		}

		const startD = this.lengthMap[slot]
		const endD = this.lengthMap[slot + 1]

		let dRatio = (distance - startD) / (endD - startD)
		if (isNaN(dRatio))
			dRatio = 1
		const point1 = this.side[slot]
		const point2 = this.side[slot + 1]
		return {
			x: ((point2.x - point1.x) * dRatio) + point1.x,
			y: ((point2.y - point1.y) * dRatio) + point1.y,
			angle: Math.atan2(point2.y - point1.y, point2.x - point1.x) - Math.PI / 2
		}
	}

	/**
	 * @param {number} y The ratio along the height of the profile
	 * @returns {number}
	 */
	getDistanceAt(y) {
		let slot = 1
		const absY = (y * this.height) + this.side[0].y
		while (this.side[slot] && this.side[slot].y < absY)
			slot++

		if (slot >= this.side.length)
			slot = this.side.length - 1

		const start = this.side[slot - 1]
		const end = this.side[slot]
		const distRatio = (absY - start.y) / (end.y - start.y)
		return this.lengthMap[slot - 1] +
			(this.lengthMap[slot] - this.lengthMap[slot - 1]) * distRatio
	}
}

/**
 * @param {number} value
 * @param {number} smoothing 
 * @param {boolean} [oppDir] 
 * @returns {number}
 */
function smooth(value, smoothing, oppDir) {
	const factor = 1 + (smoothing * 2)
	return oppDir ? 1 - Math.pow(1 - value, factor) : Math.pow(value, factor)
}