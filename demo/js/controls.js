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
 * Types of elements supported now
 * slider - a number type with min and max limits
 * toggle - a simple input check box
 * color - input of type color
 * gradient - color gradient. Basically a collection of color inputs
 * range - a min and max pair of values. View is a slider with two handle buttons
 */

/**
 * @param {*} value 
 * @returns {boolean}
 */
function isNull(value) {
	return value === undefined || value === null
}

export class CONTROLS {
	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary A template object to populate the controls. See controlTypes.d.ts
	 * @param {HTMLElement} targetDOM The target dom into which control markup should be populated 
	 * @param {*} [sourceObj] The object the CONTROLS.js will be modifying. This can be an empty object too
	 */
	constructor(dictionary, targetDOM, sourceObj) {
		this.config = sourceObj || {}
		this.populateControls(dictionary, this.config, targetDOM)
	}

	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary 
	 * @param {*} source
	 * @param {HTMLElement} target
	 */
	populateControls(dictionary, source, target) {
		for (const prop in dictionary.properties) {
			if (!dictionary.properties[prop].onChange)
				dictionary.properties[prop].onChange = dictionary.onChange
			if (dictionary.properties[prop].type == "array") {
				//create a master container
				const innerTarget = this.createContainer(dictionary.properties[prop], prop, target)
				if (!source[prop])
					source[prop] = []
				for (let i = 0; i < source[prop].length; i++) {
					const moreInnerTarget = this.createContainer(dictionary.properties[prop], prop, innerTarget, i + 1)
					this.createDeleteButton(source[prop], moreInnerTarget.parentElement, dictionary.onChange)
					this.populateControls(dictionary.properties[prop], source[prop][i], moreInnerTarget)
				}
				this.createAddButton(dictionary.properties[prop], source[prop], innerTarget.parentElement, prop)
				this.setDraggable(innerTarget, source[prop], dictionary.onChange)
			} else if (!dictionary.properties[prop].properties) {
				target.appendChild(this.createProperty(dictionary.properties[prop], source, prop))
			} else {
				if (!source[prop])
					source[prop] = {}
				this.populateControls(dictionary.properties[prop], source[prop], this.createContainer(dictionary.properties[prop], prop, target))
			}
		}
	}

	/**
	 * @param {any[]} source
	 * @param {HTMLElement} target
	 * @param {()=>void} onChange
	 */
	createDeleteButton(source, target, onChange) {
		const innerTarget = target.querySelector(".controlHeader h2")
		const deleteButton = document.createElement("button")
		innerTarget.appendChild(deleteButton)
		deleteButton.innerHTML = "-"
		deleteButton.classList.add("controlAddButton")
		deleteButton.addEventListener("pointerup", function(event) {
			event.preventDefault()
			event.stopPropagation()
			const elements = target.parentElement.children
			let deleteIndex = 0
			for (let i = 0; i < elements.length; i++) {
				if (elements[i] == target) {
					deleteIndex = i
				}
			}
			source.splice(deleteIndex, 1)
			target.parentElement.removeChild(target)
			onChange && onChange()
		})
	}

	/**
	 * 
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary 
	 * @param {*} source 
	 * @param {HTMLElement} target 
	 * @param {string} prop
	 */
	createAddButton(dictionary, source, target, prop) {
		const buttonTarget = target.querySelector(".controlHeader h2")
		const addButton = document.createElement("button")
		buttonTarget.appendChild(addButton)
		addButton.innerHTML = "+"
		addButton.classList.add("controlAddButton")
		const _this = this
		addButton.addEventListener("pointerup", function(event) {
			event.preventDefault()
			event.stopPropagation()
			let newEntry
			//generate an entry. Just duplicate the previous element if avaiable
			if (source.length)
				newEntry = JSON.parse(JSON.stringify(source[source.length - 1]))
			else {
				newEntry = {}
				scrapeDictionaryForDefaults(dictionary, {})
			}

			source.push(newEntry)
			const innerTarget = /** @type {HTMLDivElement} */ (target.querySelector(".controlElementsContainer"))
			const newContainer = _this.createContainer(dictionary, prop, innerTarget, source.length)
			_this.createDeleteButton(source, newContainer.parentElement, dictionary.onChange)
			_this.populateControls(dictionary, newEntry, newContainer)
			dictionary.onChange && dictionary.onChange()
			_this.setDraggable(innerTarget, source, dictionary.onChange)
		})
	}

	/**
	 * this is atomic property
	 * @param {CONTROLS_TYPES.ControlType} propertyObj
	 * @param {*} source 
	 * @param {string} key
	 * @returns {HTMLElement}
	 */
	createProperty(propertyObj, source, key) {
		const propertyContainer = document.createElement("div")
		propertyContainer.classList.add("controlElementContainer", "controlDisplaySpaceBetween")
		const labelElem = document.createElement("label")
		labelElem.classList.add("controlLabel")
		labelElem.innerHTML = propertyObj.label || key
		propertyContainer.appendChild(labelElem)
		if (!propertyObj.type)
			propertyObj.type = "slider"
		/** @type {HTMLInputElement} */
		let inputElement
		/** @type {HTMLElement} */
		let customDom

		if (isNull(source[key]) && !isNull(propertyObj.default))
			source[key] = JSON.parse(JSON.stringify(propertyObj.default))

		switch (propertyObj.type) {
			case "slider":
			case "number": {
				inputElement = document.createElement("input")
				inputElement.type = propertyObj.type == "slider" ? "range" : "number"
				inputElement.min = (propertyObj.min || 0) + ""
				inputElement.max = (propertyObj.max || 1) + ""
				inputElement.step = (propertyObj.step || 0.01) + ""
				if (propertyObj.inverseDirection)
					inputElement.classList.add("controlInverse")
				inputElement.value = (source[key] || 0) + ""
				let previousValue = inputElement.value
				const regex = /^\d*\.?\d*$/

				inputElement.addEventListener("input", () => {
					let newValue = parseFloat(inputElement.value)
					source[key] = newValue
					let callChange = true
					if (propertyObj.type == "number") {
						if (inputElement.value && !regex.test(inputElement.value)) {
							inputElement.value = previousValue
							callChange = false
						} else
							previousValue = inputElement.value
					}
					callChange && propertyObj.onChange && propertyObj.onChange()
				})
				break
			}
			case "toggle":
				inputElement = document.createElement("input")
				inputElement.type = "checkbox"
				inputElement.checked = source[key]
				inputElement.addEventListener("input", () => {
					source[key] = inputElement.checked
					propertyObj.onChange && propertyObj.onChange()
				})
				break
			case "color":
				inputElement = document.createElement("input")
				inputElement.type = "color"
				inputElement.value = source[key] || "#000000"
				inputElement.addEventListener("input", () => {
					source[key] = inputElement.value
					propertyObj.onChange && propertyObj.onChange()
				})
				break
			case "range":
				if (!source[key])
					source[key] = [0.25, 0.75]
				customDom = createRange(propertyObj, source[key])
				break
			case "gradient":
				if (!source[key])
					source[key] = [{ offset: 0.5, color: "#cccccc" }]
				customDom = createRange(propertyObj, source[key])
				break
		}
		if (inputElement) {
			inputElement.classList.add("controlElement")
			propertyContainer.appendChild(inputElement)
		}
		if (customDom)
			propertyContainer.appendChild(customDom)
		return propertyContainer
	}

	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary
	 * @param {string} prop
	 * @param {HTMLElement} target
	 * @param {number} [index]
	 * @returns {HTMLElement} The new target to populate controls
	 */
	createContainer(dictionary, prop, target, index) {
		const container = document.createElement("div")
		container.classList.add("controlContainer", "controlCollapsed")

		/**
		 * @returns number
		 */
		function getIndex() {
			const children = container.parentElement.querySelectorAll(":scope > .controlContainer")
			for (let i = 0; children.length; i++)
				if (children[i] == container)
					return i
		}

		//header
		const header = document.createElement("div")
		header.classList.add("controlHeader", "controlDisplaySpaceBetween")
		container.appendChild(header)
		header.addEventListener("pointerup", function(event) {
			if (container.hasAttribute("data-draggged")) {
				container.removeAttribute("data-dragged")
				return
			}
			event.preventDefault()
			event.stopPropagation()
			container.removeAttribute("draggable")
			header.querySelector("button.controlCollapsor").dispatchEvent(new PointerEvent("pointerup"))
		})
		if (dictionary.headerHover) {
			header.addEventListener("pointerenter", function() {
				const index = getIndex()
				if (index > -1)
					dictionary.headerHover.enter(index)
			})
			header.addEventListener("pointerleave", function() {
				const index = getIndex()
				if (index > -1)
					dictionary.headerHover.leave(index)
			})
		}

		const labelElem = document.createElement("h2")
		labelElem.innerHTML = (dictionary.label || prop).toUpperCase() +
			(typeof index == "number" ? " " + index : "")

		const collapsorButton = document.createElement("button")
		collapsorButton.classList.add("controlCollapsor")
		collapsorButton.addEventListener("pointerup", (event) => {
			event.preventDefault()
			event.stopPropagation()
			container.classList.toggle("controlCollapsed")
		})

		header.appendChild(labelElem)
		header.appendChild(collapsorButton)

		const controlsContainer = document.createElement("div")
		controlsContainer.classList.add("controlElementsContainer")
		container.appendChild(controlsContainer)

		target.appendChild(container)

		return controlsContainer
	}

	/**
	 * @returns {string}
	 */
	getConfig() {
		return JSON.stringify(this.config, null, 2)
	}

	/**
	 * 
	 * @param {HTMLElement} parentElement 
	 * @param {any[]} array 
	 * @param {()=>void} cb
	 */
	setDraggable(parentElement, array, cb) {
		const children = /** @type {NodeListOf<HTMLElement>} */
			(parentElement.querySelectorAll(":scope > .controlContainer"))

		for (let i = 0; i < children.length; i++) {
			const element = children[i]
			if (element.hasAttribute("data-made-draggable"))
				continue

			element.setAttribute("data-made-draggable", "true")
			const controlHeader = element.querySelector(".controlHeader")
			controlHeader.addEventListener("pointerdown", (event) => {
				if (event.target == controlHeader)
					element.setAttribute("draggable", "true")
			})

			element.ondragstart = () => {
				this.currentDraggedElement = element
				element.setAttribute("data-dragged", "true")
			}
			element.ondragover = (event) => event.preventDefault()
			element.ondragend = () => element.removeAttribute("draggable")
			element.ondrop = () => {
				if (this.currentDraggedElement != element &&
					this.currentDraggedElement.parentElement == element.parentElement) {
					let currentPosition = 0,
						toPosition = 0
					/**
					 * This because the children order might have already updated with prior sorts
					 */
					const updatedChildren = (parentElement.querySelectorAll(":scope > .controlContainer"))
					for (let j = 0; j < updatedChildren.length; j++) {
						if (updatedChildren[j] == this.currentDraggedElement)
							currentPosition = j
						if (updatedChildren[j] == element)
							toPosition = j
					}
					const removedObj = array.splice(currentPosition, 1)[0]
					array.splice(toPosition, 0, removedObj)
					if (currentPosition < toPosition)
						parentElement.insertBefore(this.currentDraggedElement, element.nextSibling)
					else
						parentElement.insertBefore(this.currentDraggedElement, element)
					this.currentDraggedElement.removeAttribute("data-dragged")
					cb && cb()
				}
			}
			element.removeAttribute("draggable")
		}
	}
}

/** @type {HTMLElement} */
let currentHandle

/**
 * @param {CONTROLS_TYPES.GradientType|CONTROLS_TYPES.RangeType} rangeObj
 * @param {number[]|CONTROLS_TYPES.GradientStop[]} values
 * @returns {HTMLDivElement}
 */
function createRange(rangeObj, values) {
	const customDom = document.createElement("div")
	customDom.classList.add("customontrolElement", "rangeSlider")
	const rangeBackground = document.createElement("div")
	customDom.appendChild(rangeBackground)
	rangeBackground.classList.add("sliderRail")
	const handles = /** @type {HTMLElement[]} */ ([])
	let range = [0, 1]

	/**
	 * @param {number} i 
	 */
	function createHandle(i) {
		/** @type {HTMLElement} */
		let handle
		/** @type {number} */
		let itemValue
		if (rangeObj.type == "range") {
			handle = document.createElement("div")
			itemValue = /** @type {number} */ (values[i])
			range = [rangeObj.min, rangeObj.max]
		} else {
			let colorHandle = document.createElement("input")
			handle = colorHandle
			colorHandle.type = "color"
			const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (values)
			colorHandle.addEventListener("input", () => {
				offsetValues[handles.indexOf(handle)].color = colorHandle.value
				rangeObj.onChange && rangeObj.onChange()
			})
			itemValue = ((offsetValues[i].offset == null) ? 0.5 : offsetValues[i].offset)
			colorHandle.classList.add("colorHandle")
			colorHandle.value = offsetValues[i].color
		}
		handle.classList.add("rangeSliderHandle")
		if (i < handles.length) {
			customDom.insertBefore(handle, handles[i])
			handles.splice(i, 0, handle)
		} else {
			customDom.appendChild(handle)
			handles.push(handle)
		}
		handle.style.left = (((itemValue - range[0]) / (range[1] - range[0]) * 100)) + "%"
		handle.addEventListener("pointerdown", (event) => {
			currentHandle = handle
			if (rangeObj.type == "gradient") {
				if (event.button == 2 && values.length > 1) {
					handle.parentElement.removeChild(handle)
					const index = handles.indexOf(currentHandle)
					handles.splice(index, 1)
					values.splice(index, 1)
					currentHandle = null
					event.preventDefault()
					rangeObj.onChange && rangeObj.onChange()
				}
			}
		})
	}

	values.forEach((value, i) => createHandle(i))

	if (rangeObj.type == "gradient") {
		const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (values)
		rangeBackground.addEventListener("dblclick", (event) => {
			const ratio = (event.clientX - customDom.offsetLeft) / customDom.offsetWidth
			if (ratio < 0 || ratio > 1) {
				return
			}
			const value = range[0] + ((range[1] - range[0]) * ratio)
			let min = -Infinity
			let createAtIndex = values.length
			for (let i = 0; i < values.length; i++) {
				if (value > min && value < offsetValues[i].offset) {
					createAtIndex = i
					break
				}
				min = offsetValues[i].offset
			}
			values.splice(createAtIndex, 0, { offset: value, color: "#ffffff" })
			createHandle(createAtIndex)
			rangeObj.onChange && rangeObj.onChange()
		})
	}

	customDom.addEventListener("pointermove", function(event) {
		if (currentHandle) {
			const ratio = (event.clientX - customDom.offsetLeft) / customDom.offsetWidth
			if (ratio < 0 || ratio > 1) {
				return
			}
			const index = handles.indexOf(currentHandle)
			const value = range[0] + ((range[1] - range[0]) * ratio)
			if (rangeObj.type == "range") {
				if (values[index + 1] != null && value > values[index + 1])
					return
				if (values[index - 1] != null && value < values[index - 1])
					return
				values[index] = value
			} else {
				const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (values)
				if (offsetValues[index + 1] != null && value > offsetValues[index + 1].offset)
					return
				if (offsetValues[index - 1] != null && value < offsetValues[index - 1].offset)
					return
				offsetValues[index].offset = value
			}
			currentHandle.style.left = ratio * 100 + "%"
			rangeObj.onChange && rangeObj.onChange()
		}
	})

	return customDom
}

/**
 * 
 * @param {CONTROLS_TYPES.BaseProperty} dictionary 
 * @param {*} obj 
 */
function scrapeDictionaryForDefaults(dictionary, obj) {
	if (dictionary.properties) {
		for (let key in dictionary.properties) {
			const propertyObj = dictionary.properties[key]
			if (Object.prototype.hasOwnProperty.call(propertyObj, "default"))
				obj[key] = propertyObj.default
			else if (Object.prototype.hasOwnProperty.call(propertyObj, "properties")) {
				obj[key] = {}
				scrapeDictionaryForDefaults(propertyObj, obj[key])
			}
		}
	}
}

document.addEventListener("pointerup", () => currentHandle = null)