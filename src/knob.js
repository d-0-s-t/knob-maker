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
 * @typedef {object} KNOB_BODY_CONFIG
 * @property {number} height
 * @property {number} radius
 * @property {number} [topRadius] when not available is equal to radius
 * @property {number} [bottomRadius] When not available is equal to radius
 * @property {number} [sides]
 * @property {number} [balance] section along the height representative
 *  of the radius. default is 0.5
 * @property {number} [smoothing] 0 is linear and 1 is curvy
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
 * @property {number} [balance] same as body options but defaults to one
 * @property {number} [angle]
 * @property {SPLINE_CONFIG[]} [splines]
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
 * @property {number} [scaleSmoothing]
 */

/**
 * @typedef {object} SPLINE_CONFIG
 * @property {number} count
 * @property {number[]} range
 * @property {number} height the height of the tooth radially.
 * @property {number} thickness
 * @property {number} [rootThickness]
 * @property {number} [smoothing]
 * @property {number} [topScale=1]
 * @property {number} [bottomScale=1]
 * @property {number} [scaleSmoothing=0]
 * @property {number} [angle=0]
 * @property {number} [angleSmoothing=0]
 */

/** one per millimeter */
const TESELLATION = 1

/**
 * @typedef {BABYLON.Mesh|BABYLON.InstancedMesh} Mesh
 */

export class KNOB {

	/**
	 * @param {KNOB_CONFIG} config 
	 * @param {BABYLON.Scene} scene 
	 * // @param {boolean} [draftMode] [WIP - NOT IMPLEMENTED] Doesn't combine meshes and doesn't perform CSG.
	 * Meshes will be transuncent to see through. This is mainly for performance reasons
	 */
	constructor(config, scene) {
		/** @type {KNOB_CONFIG} */
		this.config = JSON.parse(JSON.stringify(config))
		this.scene = scene
		this.knurlingMeshes = /** @type {Mesh[]} */ ([])
		this.surfaceSplines = /** @type {Mesh[]} */ ([])
		this.screwHoleSplines = /** @type {Mesh[]} */ ([])
		this.pointers = /** @type {Mesh[]} */ ([])
		this.update(config)
	}

	/**
	 * @param {KNOB_BODY_CONFIG|KNOB_HOLE_CONFIG} bodyConfig 
	 */
	_fillDefaultsOnBody(bodyConfig) {
		if (bodyConfig.bottomRadius == undefined)
			bodyConfig.bottomRadius = bodyConfig.radius
		if (bodyConfig.topRadius == undefined)
			bodyConfig.topRadius = bodyConfig.radius
		if (bodyConfig.sides < 3)
			delete bodyConfig.sides
	}

	/**
	 * @param {KNOB_CONFIG} config
	 * @param {(keyof KNOB_CONFIG|"knurling"|"splines"|"internalSplines"|"threads")[]} [partsToUpdate] 
	 * @param {number} [index]
	 */
	update(config, partsToUpdate, index) {
		if (!partsToUpdate || partsToUpdate.length == 0)
			partsToUpdate = [
				"body", "pointers", "screwHole",
				"knurling", "splines", "threads"
			]

		if (partsToUpdate.indexOf("body") + 1) {
			this.baseShape && this.baseShape.dispose()
			Object.assign(this.config.body, config.body)
			this.baseShape = this._createBody(this.config.body)
			partsToUpdate.push("surface")
			partsToUpdate.push("screwHole")
		}
		if (partsToUpdate.indexOf("screwHole") + 1) {
			Object.assign(this.config.screwHole, config.screwHole)
			const tempShape = this._createScrewHole(this.config.screwHole)
			this.screwHoleShape && this.screwHoleShape.dispose()
			this.screwHoleShape = tempShape
			this.bodyShape && this.bodyShape.dispose()
			this.bodyShape = this._performSubstractiveCSG(this.baseShape, this.screwHoleShape, "combined")
			partsToUpdate.push("internalSplines")
		}
		if (partsToUpdate.indexOf("surface") + 1) {
			partsToUpdate.push("knurling")
			partsToUpdate.push("splines")
		}

		/**
		 * @typedef {object} ARRAY_CONFIG
		 * @property {any} parent
		 * @property {(c:*) => Mesh} creator
		 * @property {Mesh[]} stash
		 * @property {any} source
		 */

		/** @type {{[s:string]:ARRAY_CONFIG}} */
		const ARR_CONFIGS = {
			"pointers": {
				"parent": /** @type {any} */ (this.config),
				"creator": (c) => this._createPointer(c),
				"stash": this.pointers,
				"source": config.pointers
			},
			"splines": {
				"parent": this.config.surface,
				"creator": (c) => this._createSplineOn(this.bodyProfile, c),
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
				"creator": (c) => this._createSplineOn(this.screwHoleProfile, c),
				"stash": this.screwHoleSplines,
				"source": config.screwHole.splines
			}
		}

		Object.keys(ARR_CONFIGS).forEach(( /** @type {keyof ARR_CONFIGS} */ key) => {
			if (partsToUpdate.indexOf(key) + 1) {
				const creatorInfo = ARR_CONFIGS[key]
				if (index == undefined) {
					creatorInfo.parent[key] = JSON.parse(JSON.stringify(creatorInfo.source))
					creatorInfo.stash.forEach(mesh => mesh.dispose())
					creatorInfo.stash.length = 0
					creatorInfo.stash.push(...creatorInfo.parent[key].map(c => creatorInfo.creator(c)))
				} else {
					Object.assign(creatorInfo.parent[key][index], creatorInfo.source[index])
					creatorInfo.stash[index] && creatorInfo.stash[index].dispose()
					creatorInfo.stash[index] = creatorInfo.creator(creatorInfo.parent[key][index])
				}
			}
		})

		if (!this.bodyShape)
			this.bodyShape = this.baseShape

		//for debuggin
		console.log("Mesh Count:" + this.scene.meshes.length)
	}

	/**
	 * Knob is a combination of body, lips and internal stucture
	 * First create the shape that will make a body
	 * @param {KNOB_BODY_CONFIG} bodyConfig
	 * @returns {BABYLON.Mesh}
	 */
	_createBody(bodyConfig) {
		this._fillDefaultsOnBody(bodyConfig)
		if (bodyConfig.balance == undefined)
			bodyConfig.balance = 0.5

		this.bodyProfile = new Profile(bodyConfig)
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
		if (screwHoleConfig && screwHoleConfig.height && screwHoleConfig.bottomRadius) {
			this._fillDefaultsOnBody(screwHoleConfig)
			if (screwHoleConfig.balance == undefined)
				screwHoleConfig.balance = 1
			if (screwHoleConfig.angle == undefined)
				screwHoleConfig.angle = 0

			this.screwHoleProfile = new Profile(screwHoleConfig)
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

		const y = (this.config.body.height * config.position) - (config.height / 2)

		return BABYLON.MeshBuilder.ExtrudeShape("knobPointer", {
			shape: [p1, p2, p3, p4, p1.clone()],
			path: [
				new BABYLON.Vector3(0, y, 0),
				new BABYLON.Vector3(0, y + config.height, 0)
			],
			cap: BABYLON.Mesh.CAP_ALL
		})
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

		baseMesh.position.z = this.config.body.radius - ((1 - config.rise) * config.depth)

		if (config.shape == "rectangle")
			baseMesh.position.z += config.depth / 2

		const yStart = this.config.body.height * config.range[0] + halfY
		const yEnd = this.config.body.height * config.range[1] - halfY
		baseMesh.position.y = yStart
		const yDist = config.sizeY + config.verticalSpacing
		config.radialCount = Math.min(100, config.radialCount)
		const radialStep = Math.PI * 2 / config.radialCount
		let angle = 0
		const verticalAxis = new BABYLON.Vector3(0, 1, 0)
		const xAxis = new BABYLON.Vector3(-1, 0, 0)
		const center = BABYLON.Vector3.Zero()
		let meshID = 0
		const parentMesh = new BABYLON.Mesh("knurlingParentMesh")
		/** @type {BABYLON.InstancedMesh} */
		let referenceMesh
		/** profile is cylinder */
		if ((this.config.body.topRadius == this.config.body.radius &&
				this.config.body.topRadius == this.config.body.bottomRadius)) {
			for (let j = 0; j < config.radialCount; j++) {
				let yPos = yStart - (config.verticalOffset * j)
				while (yPos < yStart) {
					yPos += config.sizeY
				}
				referenceMesh = null
				while (yPos <= yEnd) {
					const t = baseMesh.createInstance(baseMesh.name + meshID++)
					if (!referenceMesh) {
						t.rotateAround(center, verticalAxis, angle)
						referenceMesh = t
					} else {
						copyTransform(t, referenceMesh)
					}
					t.position.y = yPos
					yPos += yDist
					t.setParent(parentMesh)
				}
				angle += radialStep
			}
		} else {
			const slopeHeightMap = /** @type {{angle:number,y:number,x:number}[]} */ ([])
			let slot = 0
			let yPos = this.bodyProfile.getDistanceAt(config.range[0]) + halfY
			const yPosLimit = this.bodyProfile.getDistanceAt(config.range[1]) - halfY
			while (yPos < yPosLimit) {
				while (yPos > this.bodyProfile.lengthMap[slot]) {
					slot++
				}
				slopeHeightMap.push(this.bodyProfile.getInfoAt(yPos, slot - 1))
				yPos += yDist
			}
			for (let j = 0; j < config.radialCount; j++) {
				for (let i = 0; i < slopeHeightMap.length; i++) {
					const t = baseMesh.createInstance(baseMesh.name + meshID++)
					t.position.y = slopeHeightMap[i].y
					t.position.z = slopeHeightMap[i].x
					t.rotateAround(
						new BABYLON.Vector3(0, t.position.y, t.position.z),
						xAxis,
						slopeHeightMap[i].angle
					)
					t.rotateAround(center, verticalAxis, angle)
					t.setParent(parentMesh)
					referenceMesh = t
				}
				angle += radialStep
			}
		}

		copyTransform(baseMesh, referenceMesh)
		baseMesh.setParent(parentMesh)
		referenceMesh.dispose()

		return parentMesh
	}

	/**
	 * @param {Profile} profile
	 * @param {SPLINE_CONFIG} config
	 * @returns {BABYLON.Mesh}
	 */
	_createSplineOn(profile, config) {
		if (config.count < 1 || !config.height)
			return null

		const start = profile.getDistanceAt(config.range[0])
		const end = profile.getDistanceAt(config.range[1])

		const absYStart = config.range[0] * this.config.body.height
		const absYEnd = config.range[1] * this.config.body.height

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
		const midSection = this.config.body.height * this.config.body.balance
		const paths = []
		const angleStep = Math.abs(config.angle / tessellations)
		let pathRotation = 0
		for (let i = 0; i <= tessellations; i++) {
			const dInfo = profile.getInfoAt(currentD)
			let dScale = 1
			if (dInfo.y >= midSection) {
				const ratio = (dInfo.y - midSection) / (absYEnd - midSection)
				dScale = 1 + (config.topScale - 1) * smooth(ratio, config.scaleSmoothing, oppSmoothing)
			} else {
				const ratio = (dInfo.y - midSection) / (absYStart - midSection)
				dScale = 1 + (config.bottomScale - 1) * smooth(ratio, config.scaleSmoothing, oppSmoothing)
			}
			currentD += distanceStep

			const currentAngle = config.angle * smooth(pathRotation,
				config.angleSmoothing,
				oppAngleSmoothing)
			pathRotation += angleStep

			paths[i + 1] = this._createSplineProfile(
				config.rootThickness * dScale,
				config.thickness * dScale,
				config.height * dScale,
				dInfo.x,
				config.smoothing,
				dInfo.y,
				currentAngle
			)
		}

		paths[0] = centerArr(paths[1])
		paths.push(centerArr(paths[paths.length - 1]))

		const baseMesh = BABYLON.MeshBuilder.CreateRibbon("baseSpline", {
			pathArray: paths,
			sideOrientation: config.height > 0 ?
				BABYLON.Mesh.BACKSIDE : null
		})
		baseMesh.convertToFlatShadedMesh()

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

		return baseMesh
	}

	/**
	 * @param {number} rb this is in radians thickness at base
	 * @param {number} rt this is in radians thickness at tip
	 * @param {number} h 
	 * @param {number} r radius of the circle at the balance point
	 * @param {number} s smoothing factor
	 * @param {number} [hPos]
	 * @param {number} [offset]
	 * @returns {BABYLON.Vector3[]}
	 */
	_createSplineProfile(rb, rt, h, r, s, hPos = 0, offset = 0) {
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
			p.y = hPos
			return p
		}

		const numBasePoints = 18 //Math.round(r * rb * tessellations)
		let arcStep = rb / numBasePoints
		let currentStep = -rb / 2 + offset
		for (let i = 0; i <= numBasePoints; i++) {
			profile.push(getPointAtMod(currentStep, r))
			currentStep += arcStep
		}

		const numSidePoints = 18 //Math.round(r * (Math.abs(rt - rb) / 2) * tessellations)
		arcStep = (rt - rb) / (2 * numSidePoints)
		currentStep = (rb / 2) + offset
		let currentHeight = 0
		const heightStep = h / numSidePoints
		const oppDir = s > 0 ? false : true
		s = Math.abs(s) || 0
		for (let i = 0; i < numSidePoints - 1; i++) {
			currentStep += arcStep
			currentHeight += heightStep
			const ch = h * smooth(currentHeight / h, s, oppDir)
			profile.push(getPointAtMod(currentStep, r + ch))
		}

		const numTipPoints = 18 //Math.round((r + h) * rt * tessellations)
		arcStep = -rt / numTipPoints
		currentStep = (rt / 2) + offset
		for (let i = 0; i <= numTipPoints; i++) {
			profile.push(getPointAtMod(currentStep, r + h))
			currentStep += arcStep
		}

		arcStep = -(rt - rb) / (2 * numSidePoints)
		currentStep = -(rt / 2) + offset
		currentHeight = h
		for (let i = 0; i < numSidePoints - 1; i++) {
			currentStep -= arcStep
			currentHeight -= heightStep
			const ch = h * smooth(currentHeight / h, s, oppDir)
			profile.push(getPointAtMod(currentStep, r + ch))
		}

		profile.push(profile[0].clone())
		return profile
	}

	dispose() {
		this.baseShape.dispose()
		this.screwHoleShape && this.screwHoleShape.dispose()
		this.bodyShape.dispose()
		this.surfaceSplines.forEach(mesh => mesh.dispose())
		this.screwHoleSplines.forEach(mesh => mesh.dispose())
		this.knurlingMeshes.forEach(mesh => mesh.dispose())
		this.pointers.forEach(mesh => mesh.dispose())
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
	 * 
	 * @param {KNOB_BODY_CONFIG} config 
	 */
	constructor(config) {
		this.shape = /** @type {BABYLON.Vector3[]} */ ([])
		if (!config.smoothing) {
			this.shape.push(
				new BABYLON.Vector3(0, 0, 0),
				new BABYLON.Vector3(config.bottomRadius, 0, 0),
				new BABYLON.Vector3(config.radius, config.height * config.balance, 0),
				new BABYLON.Vector3(config.topRadius, config.height, 0),
				new BABYLON.Vector3(0, config.height, 0)
			)
		} else {
			const y1 = config.height * config.balance
			//bottom Section
			const startPoint = new BABYLON.Vector3(config.bottomRadius, 0, 0)
			const midPoint = new BABYLON.Vector3(config.radius, y1, 0)
			const endPoint = new BABYLON.Vector3(config.topRadius, config.height, 0)
			const phase1 = this._tessellatePath(startPoint, midPoint, config.smoothing, true)
			phase1.pop()
			this.shape.push(new BABYLON.Vector3(0, 0, 0))
			this.shape.push(...phase1)
			this.shape.push(...this._tessellatePath(midPoint, endPoint, config.smoothing))
			this.shape.push(new BABYLON.Vector3(0, config.height, 0))
		}
		this.lengthMap = [0]
		this.side = this.shape.filter((v, i) => !(i == 0 || i == this.shape.length - 1))
		let distance = 0
		for (let i = 2; i < this.shape.length - 1; i++) {
			distance += BABYLON.Vector3.Distance(this.shape[i], this.shape[i - 1])
			this.lengthMap.push(distance)
		}
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

		const dRatio = (distance - startD) / (endD - startD)
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
		const height = y * this.side[this.side.length - 1].y
		while (this.side[slot] && this.side[slot].y < height)
			slot++

		if (slot >= this.side.length)
			slot = this.side.length - 1

		const start = this.side[slot - 1]
		const end = this.side[slot]
		const distRatio = (height - start.y) / (end.y - start.y)
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