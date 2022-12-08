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
 * @property {SURFACE_CONFIG} [surface]
 */

/**
 * @typedef {object} SURFACE_CONFIG
 * @property {KNURLING_CONFIG[]} [knurling]
 * @property {SPLINE[]} [splines]
 */

/**
 * @typedef {object} KNURLING_CONFIG
 * @property {number} sizeX
 * @property {number} sizeY
 * @property {number} depth
 * @property {number} radialCount
 * @property {number} [verticalSpacing]
 * @property {number} [verticalOffset] 
 * @property {number} [rise]
 * @property {number[]} [range]
 * @property {number} [shapeRotation]
 * @property {"pyramid"|"rectangle"|"cylinder"|"cone"|"triangle"} [shape] Not implemented. Defaults to pyramid
 */

/**
 * @typedef {object} SPLINE
 * @property {number} count
 * @property {number[]} range
 * @property {"gear"|"block"} profile The shape of the tooth
 * @property {number} height the height of the tooth radially.
 * @property {number} thickness
 * @property {number} [tipThichness]
 * @property {number} [rootThichness]
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
	 * @param {boolean} [draftMode] [WIP - NOT IMPLEMENTED] Doesn't combine meshes and doesn't perform CSG.
	 * Meshes will be transuncent to see through. This is mainly for performance reasons
	 */
	constructor(config, scene, draftMode) {
		this.fillDefaults(config)
		this.scene = scene
		this.knurlingMeshes = /** @type {Mesh[]} */ ([])
		this.splines = /** @type {Mesh[]} */ ([])
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
	 * @param {(keyof KNOB_CONFIG|"knurling"|"splines")[]} [partsToUpdate] 
	 */
	update(config, partsToUpdate) {
		if (!partsToUpdate || partsToUpdate.length == 0) {
			partsToUpdate = ["body", "pointer", "screwHole", "knurling"]
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
			partsToUpdate.push("surface")
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

		if (partsToUpdate.indexOf("surface") + 1) {
			partsToUpdate.push("knurling")
			partsToUpdate.push("splines")
		}

		if (partsToUpdate.indexOf("knurling") + 1) {
			this.knurlingMeshes.forEach(mesh => mesh.dispose())
			this.config.surface.knurling = JSON.parse(JSON.stringify(config.surface.knurling))
			this.knurlingMeshes = this._createKnurlingGroup(this.config.surface.knurling)
		}

		if (partsToUpdate.indexOf("splines") + 1) {
			this.splines.forEach(mesh => mesh.dispose())
			this.config.surface.splines = JSON.parse(JSON.stringify(config.surface.splines))
			this.splines = this._createSplinesGroup(this.config.surface.splines)
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
		this.profileLengthMap = [0]
		this.sideProfile = shape.filter((v, i) => !(i == 0 || i == shape.length - 1))
		let distance = 0
		for (let i = 2; i < shape.length - 1; i++) {
			distance += BABYLON.Vector3.Distance(shape[i], shape[i - 1])
			this.profileLengthMap.push(distance)
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
		for (let i = 0; i <= subDivisions; i++) {
			const point = new BABYLON.Vector3(0, 0, 0)
			point.x = startPoint.x + (xDiff * this._smoothF(position, smoothing, opposite))
			point.y = yPos
			yPos += yIncrement
			path.push(point)
			position += step
		}
		return path
	}

	/**
	 * @param {number} pos
	 * @param {number} smoothing 
	 * @param {boolean} [oppDir] 
	 * @returns {number}
	 */
	_smoothF(pos, smoothing, oppDir) {
		const factor = 1 + (smoothing * 2)
		return oppDir ? 1 - Math.pow(1 - pos, factor) : Math.pow(pos, factor)
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

	/**
	 * @param {KNURLING_CONFIG[]} config 
	 * @returns {BABYLON.Mesh[]}
	 */
	_createKnurlingGroup(config) {
		const array = /** @type {BABYLON.Mesh[]} */ ([])
		const _this = this
		config.forEach(c => _this._createKnurling(c, array))
		return array
	}

	/**
	 * @param {KNURLING_CONFIG} config
	 * @param {(BABYLON.Mesh|BABYLON.InstancedMesh)[]} meshArr
	 */
	_createKnurling(config, meshArr) {
		if (!(config.sizeX && config.sizeY && config.depth))
			return
		/** @type {BABYLON.Mesh} */
		let baseMesh
		if (!config.shape)
			config.shape = "pyramid"
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
				while (yPos < yEnd) {
					const t = baseMesh.createInstance(baseMesh.name + meshID++)
					if (!referenceMesh) {
						t.rotateAround(center, verticalAxis, angle)
						referenceMesh = t
					} else {
						copyRotation(t, referenceMesh)
						t.position.copyFrom(referenceMesh.position)
					}
					meshArr.push(t)
					t.position.y = yPos
					yPos += yDist
				}
				angle += radialStep
			}
		} else {
			const slopeHeightMap = /** @type {{angle:number,y:number,x:number}[]} */ ([])
			let slot = 0
			let yPos = this.getDistanceAtY(this.config.body.height * config.range[0]) + halfY
			const yPosLimit = this.getDistanceAtY(this.config.body.height * config.range[1]) - halfY
			while (yPos < yPosLimit) {
				while (yPos > this.profileLengthMap[slot]) {
					slot++
				}
				slopeHeightMap.push(this.getProfileInfoAt(yPos, slot - 1))
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
					meshArr.push(t)
				}
				angle += radialStep
			}
		}
		const lastMesh = meshArr.pop()
		if (!lastMesh) {
			baseMesh.dispose()
			return
		}
		meshArr.push(baseMesh)
		baseMesh.position.copyFrom(lastMesh.position)
		copyRotation(baseMesh, lastMesh)
		lastMesh.dispose()
	}

	/**
	 * @param {SPLINE[]} config
	 * @returns {(BABYLON.Mesh|BABYLON.InstancedMesh)[]}
	 */
	_createSplinesGroup(config) {
		const array = /** @type {BABYLON.Mesh[]} */ ([])
		const _this = this
		config.forEach(c => _this._createSpline(c, array))
		return array
	}

	/**
	 * @param {SPLINE} config
	 * @param {(BABYLON.Mesh|BABYLON.InstancedMesh)[]} arr
	 */
	_createSpline(config, arr) {
		if (config.count < 1)
			return

		const profile = /** (@BABYLON.Vector3) */ ([])
		const start = this.getDistanceAtY(config.range[0] * this.config.body.height)
		const end = this.getDistanceAtY(config.range[1] * this.config.body.height)

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

		let oppSmoothing = false
		if (config.scaleSmoothing < 0) {
			oppSmoothing = true
			config.scaleSmoothing = Math.abs(config.scaleSmoothing)
		}

		const halfThickness = config.thickness / 2
		switch (config.profile) {
			case "gear":
				break
			case "block":
				profile.push(
					new BABYLON.Vector3(-halfThickness, 0, 0),
					new BABYLON.Vector3(halfThickness, 0, 0),
					new BABYLON.Vector3(halfThickness, config.height, 0),
					new BABYLON.Vector3(-halfThickness, config.height, 0)
				)
				break
		}

		const tessellations = Math.ceil((end - start) * TESELLATION)
		const distanceStep = (end - start) / tessellations
		let currentD = start
		const path = /** @type {BABYLON.Vector3[]} */ ([])
		const scale = /** @type {number[]} */ ([])
		const midSection = this.config.body.height * this.config.body.balance
		for (let i = 0; i <= tessellations; i++) {
			const dInfo = this.getProfileInfoAt(currentD)
			currentD += distanceStep
			let dScale = 1
			if (dInfo.y >= midSection) {
				const ratio = (dInfo.y - midSection) / (absYEnd - midSection)
				dScale = 1 + (config.topScale - 1) * this._smoothF(ratio, config.scaleSmoothing, oppSmoothing)
			} else {
				const ratio = (dInfo.y - midSection) / (absYStart - midSection)
				dScale = 1 + (config.bottomScale - 1) * this._smoothF(ratio, config.scaleSmoothing, oppSmoothing)
			}
			path.push(new BABYLON.Vector3(0, dInfo.y, dInfo.x))
			scale.push(dScale)
		}

		const baseMesh = BABYLON.MeshBuilder.ExtrudeShapeCustom("splineBase", {
			shape: profile,
			scaleFunction: (i) => scale[i],
			closeShape: true,
			path: path,
			cap: BABYLON.Mesh.CAP_ALL
		})
		baseMesh.convertToFlatShadedMesh()
		arr.push(baseMesh)

		const radialStep = 2 * Math.PI / config.count
		let currentAngle = 0
		const verticalAxis = new BABYLON.Vector3(0, 1, 0)
		const zero = new BABYLON.Vector3(0, 0, 0)
		for (let i = 1; i < config.count; i++) {
			currentAngle += radialStep
			const instance = baseMesh.createInstance(baseMesh.name + i)
			instance.rotateAround(zero, verticalAxis, currentAngle)
			arr.push(instance)
		}
	}

	/**
	 * @param {number} distance The linear distance along the profile
	 * @param {number} [slot] 
	 * @returns {{angle:number,y:number,x:number}}
	 */
	getProfileInfoAt(distance, slot) {
		if (slot == undefined) {
			slot = 0
			while (distance >= this.profileLengthMap[slot])
				slot++
			slot--
			if (slot >= this.profileLengthMap.length - 1)
				slot = this.profileLengthMap.length - 2
		}

		const startD = this.profileLengthMap[slot]
		const endD = this.profileLengthMap[slot + 1]

		const dRatio = (distance - startD) / (endD - startD)
		const point1 = this.sideProfile[slot]
		const point2 = this.sideProfile[slot + 1]
		return {
			x: ((point2.x - point1.x) * dRatio) + point1.x,
			y: ((point2.y - point1.y) * dRatio) + point1.y,
			angle: Math.atan2(point2.y - point1.y, point2.x - point1.x) - Math.PI / 2
		}
	}

	/**
	 * @param {number} y 
	 * @returns {number}
	 */
	getDistanceAtY(y) {
		let slot = 1
		while (this.sideProfile[slot] && this.sideProfile[slot].y < y)
			slot++

		const start = this.sideProfile[slot - 1]
		const end = this.sideProfile[slot]
		const distRatio = (y - start.y) / (end.y - start.y)
		return this.profileLengthMap[slot - 1] +
			(this.profileLengthMap[slot] - this.profileLengthMap[slot - 1]) * distRatio
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

/**
 * @param {BABYLON.Mesh|BABYLON.InstancedMesh} targetMesh 
 * @param {BABYLON.Mesh|BABYLON.InstancedMesh} sourceMesh 
 */
function copyRotation(targetMesh, sourceMesh) {
	targetMesh.rotation.copyFrom(sourceMesh.rotation)
	if (sourceMesh.rotationQuaternion) {
		if (!targetMesh.rotationQuaternion)
			targetMesh.rotationQuaternion = new BABYLON.Quaternion(0, 0, 0, 1)
		targetMesh.rotationQuaternion.copyFrom(sourceMesh.rotationQuaternion)
	}
}