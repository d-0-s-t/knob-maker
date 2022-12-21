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
	 * @param {object} [sourceObj] The object the CONTROLS.js will be modifying. This can be an empty object too
	 * @param {number} [historyLength] A non Zero value will basically enable history management
	 */
	constructor(dictionary, targetDOM, sourceObj, historyLength) {
		this.config = sourceObj || {}
		//ensure the target is empty
		targetDOM.innerHTML = ""
		this.controlsCollection = /** @type {CONTROLS_TYPES.ControlCollection} */ ({})
		if (historyLength) {
			const _this = this
			this.history = new History(historyLength)
			document.addEventListener("keypress", (event) => {
				if (event.ctrlKey) {
					const key = event.key.toLowerCase()
					if (key === "z" || key == "\x1A")
						_this.history.moveBack()
					else if (key === "y" || key == "\x19")
						_this.history.moveForward()
				}
			})
		}
		this.populateControls(dictionary, this.config, targetDOM, this.controlsCollection)
	}

	updateDOM() {
		this._updateControlList(this.controlsCollection)
	}

	/**
	 * 
	 * @param {CONTROLS_TYPES.ControlCollection} collection 
	 */
	_updateControlList(collection) {
		const keys = Object.keys(collection)
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			if (collection[key].constructor == Array) {
				const ic = /** @type {CONTROLS_TYPES.ControlsList[]} */ (collection[key])
				for (let j = 0; j < ic.length; j++) {
					this._updateControlList(ic[j])
				}
			} else if (collection[key] instanceof Control) {
				/** @type {Control} */
				(collection[key]).updateDOM()
			} else
				this._updateControlList( /** @type {CONTROLS_TYPES.ControlsList} */ (collection[key]))
		}
	}

	/**
	 * @type {CONTROLS_TYPES.PopulatorMethod}
	 */
	populateControls(dictionary, source, target, controlsParent) {
		for (const prop in dictionary.properties) {
			if (!dictionary.properties[prop].onChange)
				dictionary.properties[prop].onChange = dictionary.onChange
			if (dictionary.properties[prop].type == "array") {
				const ic = /** @type {CONTROLS_TYPES.ControlsList[]} */ ([])
				controlsParent[prop] = ic
				if (!source[prop])
					source[prop] = []
				new ControlsGroup({
					containerCreator: (...args) => this.createContainer.apply(this, args),
					populator: (...args) => this.populateControls.apply(this, args),
					prop: prop,
					source: source[prop],
					target: target,
					controlsList: ic,
					dictionary: dictionary,
					history: this.history
				})
			} else if (!dictionary.properties[prop].properties) {
				const control = new Control(dictionary.properties[prop], source, prop, this.history)
				controlsParent[prop] = control
				target.appendChild(control.container)
			} else {
				if (!source[prop])
					source[prop] = {}
				/** @type {CONTROLS_TYPES.ControlsList} */
				const innerControls = {}
				controlsParent[prop] = innerControls
				this.populateControls(dictionary.properties[prop], source[prop],
					this.createContainer(dictionary.properties[prop], prop, target, null), innerControls)
			}
		}
	}

	/**
	 * @type {CONTROLS_TYPES.ContainerCreatorMethod}
	 */
	createContainer(dictionary, prop, target, index) {
		const container = document.createElement("div")
		container.classList.add("controlContainer", "controlCollapsed")

		/**
		 * @returns {number}
		 */
		function getIndex() {
			const children = container.parentElement.querySelectorAll(":scope > .controlContainer")
			for (let i = 0; children.length; i++) {
				if (children[i] == container)
					return i
			}
			return null
		}

		const header = document.createElement("div")
		header.classList.add("controlHeader", "controlDisplaySpaceBetween")
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
		container.appendChild(header)
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
		if (dictionary.compact) {
			controlsContainer.parentElement.classList.add("compact")
			container.classList.remove("controlCollapsed")
		}
		return controlsContainer
	}

	/**
	 * @returns {string}
	 */
	getConfig() {
		return JSON.stringify(this.config, null, 2)
	}
}






export class Control {
	/**
	 * this is atomic property
	 * @param {CONTROLS_TYPES.ControlType} propertyObj
	 * @param {*} source 
	 * @param {string} key
	 * @param {History} history
	 */
	constructor(propertyObj, source, key, history) {
		const _this = this

		/**
		 * @param {any} [newVal]
		 * @param {any} [oldVal]
		 */
		function writeHistory(newVal, oldVal) {
			if (areDifferent(oldVal, newVal)) {
				history.add(new HistoryState({
					key: key,
					source: source,
					restore: (forward) => {
						if (forward)
							assignVal(source, key, newVal)
						else
							assignVal(source, key, oldVal)
						propertyObj.onChange && propertyObj.onChange(key, source)
						_this.updateDOM()
					}
				}))
			}
		}
		const debouncedHistoryWrite = debounce(writeHistory, 400, 400)

		/**
		 * @param {any} [newVal]
		 * @param {any} [oldVal]
		 */
		function internalChange(newVal, oldVal) {
			if (oldVal == undefined)
				oldVal = cloneVal(source[key])

			if (newVal == undefined)
				newVal = cloneVal(source[key])
			else
				assignVal(source, key, newVal)

			if (history)
				debouncedHistoryWrite(newVal, oldVal)

			propertyObj.onChange && propertyObj.onChange(key, source)
		}

		this.container = document.createElement("div")
		this.container.classList.add("controlElementContainer", "controlDisplaySpaceBetween")
		const labelElem = document.createElement("label")
		labelElem.classList.add("controlLabel")
		labelElem.innerHTML = propertyObj.label || makeStringHuman(key)
		this.container.appendChild(labelElem)
		if (!propertyObj.type)
			propertyObj.type = "slider"

		/** @type {HTMLInputElement|HTMLSelectElement} */
		let inputElement

		/** @type {Range} */
		let rangeElement

		if (isNull(source[key]) && !isNull(propertyObj.default))
			source[key] = JSON.parse(JSON.stringify(propertyObj.default))

		/** @type {()=>void} */
		this.updateDOM


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

				this.updateDOM = function() {
					const tfOut = propertyObj.transformOut || ((n) => n)
					inputElement.value = tfOut(source[key] || 0) + ""
				}

				const tf = propertyObj.transformIn || ((t) => t)

				/**
				 * @param {InputEvent} event 
				 */
				const onInput = (event) => {
					if (event.inputType == "historyUndo")
						history && history.moveBack()
					else if (event.inputType == "historyRedo")
						history && history.moveForward()
					else
						internalChange(tf(parseFloat(inputElement.value)))
				}


				inputElement.addEventListener("input", onInput)
				break
			}
			case "toggle":
				inputElement = document.createElement("input")
				inputElement.type = "checkbox"
				inputElement.checked = source[key]
				inputElement.addEventListener("input", () => internalChange( /** @type {HTMLInputElement} */ (inputElement).checked))

				this.updateDOM = function() {
					/** @type {HTMLInputElement} */
					(inputElement).checked = source[key]
				}
				break
			case "color":
				inputElement = document.createElement("input")
				inputElement.type = "color"
				this.updateDOM = function() {
					inputElement.value = source[key] || "#000000"
				}
				inputElement.addEventListener("input", () => { internalChange(inputElement.value) })
				break
			case "range":
				if (!source[key])
					source[key] = [0, 1]
				rangeElement = new Range(propertyObj, source, key, internalChange)
				this.updateDOM = () => rangeElement.updateDOM()
				break
			case "gradient":
				if (!source[key])
					source[key] = [{ offset: 0.5, color: "#cccccc" }]
				rangeElement = new Range(propertyObj, source, key, internalChange)
				this.updateDOM = () => rangeElement.updateDOM()
				break
			case "option": {
				inputElement = document.createElement("select")
				propertyObj.options.forEach((str) => {
					const option = document.createElement("option")
					option.value = str
					option.innerHTML = makeStringHuman(str)
					inputElement.appendChild(option)
				})
				this.updateDOM = () => {
					const optionIndex = propertyObj.options.indexOf(source[key])
					inputElement.selectedIndex = optionIndex == -1 ? 0 : optionIndex
				}
				inputElement.addEventListener("change", () => internalChange(inputElement.value))
				break
			}
		}

		if (inputElement) {
			inputElement.classList.add("controlElement")
			this.container.appendChild(inputElement)
			this.element = inputElement
		}
		if (rangeElement) {
			this.container.appendChild(rangeElement.element)
			this.element = rangeElement
		}

		this.updateDOM()
	}
}

/** @type {HTMLElement} */
let currentHandle

class Range {
	/**
	 * @param {CONTROLS_TYPES.GradientType|CONTROLS_TYPES.RangeType} rangeObj
	 * @param {{[s:string]:any}} source
	 * @param {string} key
	 * @param {(newVal:any, oldVal:any)=>void} onChange
	 */
	constructor(rangeObj, source, key, onChange) {
		this.values = /** @type {number[]|CONTROLS_TYPES.GradientStop[]} */ (source[key])
		this.element = document.createElement("div")
		this.element.classList.add("customontrolElement", "rangeSlider")
		const rangeBackground = document.createElement("div")
		this.element.appendChild(rangeBackground)
		rangeBackground.classList.add("sliderRail")
		this.handles = /** @type {HTMLElement[]} */ ([])
		this.range = [0, 1]
		this.props = rangeObj
		this.onChange = onChange

		for (let i = 0; i < this.values.length; i++)
			this.createHandle(i)
		this.setBindings(rangeBackground)
	}

	/**
	 * @param {number} i 
	 */
	createHandle(i) {
		/** @type {HTMLElement} */
		let handle
		const _this = this
		if (this.props.type == "range") {
			handle = document.createElement("div")
			this.range = [this.props.min, this.props.max]
		} else {
			let colorHandle = document.createElement("input")
			handle = colorHandle
			colorHandle.type = "color"
			const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (this.values)
			colorHandle.addEventListener("input", () => {
				const oldVal = _this.copyValues()
				offsetValues[_this.handles.indexOf(handle)].color = colorHandle.value
				_this.onChange(null, oldVal)
			})
			colorHandle.classList.add("colorHandle")
			colorHandle.value = offsetValues[i].color
		}
		handle.classList.add("rangeSliderHandle")
		if (i < this.handles.length) {
			this.element.insertBefore(handle, this.handles[i])
			this.handles.splice(i, 0, handle)
		} else {
			this.element.appendChild(handle)
			this.handles.push(handle)
		}
		handle.addEventListener("pointerdown", (event) => {
			currentHandle = handle
			if (this.props.type == "gradient") {
				if (event.button == 2 && this.values.length > 1) {
					handle.parentElement.removeChild(handle)
					const index = _this.handles.indexOf(currentHandle)
					_this.handles.splice(index, 1)
					const oldVal = _this.copyValues()
					_this.values.splice(index, 1)
					currentHandle = null
					event.preventDefault()
					_this.onChange(null, oldVal)
				}
			}
		})
	}

	/**
	 * @param {HTMLElement} rangeBackground 
	 */
	setBindings(rangeBackground) {
		const _this = this
		if (this.props.type == "gradient") {
			const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (this.values)
			rangeBackground.addEventListener("dblclick", (event) => {
				const ratio = (event.clientX - _this.element.offsetLeft) / _this.element.offsetWidth
				if (ratio < 0 || ratio > 1) {
					return
				}
				const value = _this.range[0] + ((_this.range[1] - _this.range[0]) * ratio)
				let min = -Infinity
				let createAtIndex = _this.values.length
				for (let i = 0; i < _this.values.length; i++) {
					if (value > min && value < offsetValues[i].offset) {
						createAtIndex = i
						break
					}
					min = offsetValues[i].offset
				}
				const oldVal = _this.copyValues()
				_this.values.splice(createAtIndex, 0, { offset: value, color: "#ffffff" })
				_this.createHandle(createAtIndex)
				_this.updateDOM()
				_this.onChange(null, oldVal)
			})
		}

		this.element.addEventListener("pointermove", function(event) {
			if (currentHandle) {
				const ratio = (event.clientX - _this.element.offsetLeft) / _this.element.offsetWidth
				if (ratio < 0 || ratio > 1) {
					return
				}
				const index = _this.handles.indexOf(currentHandle)
				const oldVal = _this.copyValues()
				const value = _this.range[0] + ((_this.range[1] - _this.range[0]) * ratio)
				if (_this.props.type == "range") {
					if (_this.values[index + 1] != null && value > _this.values[index + 1])
						return
					if (_this.values[index - 1] != null && value < _this.values[index - 1])
						return
					_this.values[index] = value
				} else {
					const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (_this.values)
					if (offsetValues[index + 1] != null && value > offsetValues[index + 1].offset)
						return
					if (offsetValues[index - 1] != null && value < offsetValues[index - 1].offset)
						return
					offsetValues[index].offset = value
				}
				currentHandle.style.left = ratio * 100 + "%"
				_this.onChange(null, oldVal)
			}
		})
	}

	updateDOM() {
		for (let i = 0; i < this.handles.length; i++) {
			const handle = this.handles[i]
			let itemValue
			if (this.props.type == "range")
				itemValue = /** @type {number} */ (this.values[i])
			else {
				const offsetValues = /** @type {CONTROLS_TYPES.GradientStop[]} */ (this.values)
				itemValue = ((offsetValues[i].offset == null) ? 0.5 : offsetValues[i].offset)
			}
			handle.style.left = (((itemValue - this.range[0]) / (this.range[1] - this.range[0]) * 100)) + "%"
		}
	}

	/**
	 * @returns {number[]|CONTROLS_TYPES.GradientStop[]}
	 */
	copyValues() {
		return JSON.parse(JSON.stringify(this.values))
	}
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

/**
 * @param {string} str 
 * @returns {string}
 */
function makeStringHuman(str) {
	return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(^|\s)([a-z])/gi, function(t) {
		return t.toUpperCase()
	})
}

/**
 * @param {*} x 
 * @param {*} y
 * @returns {boolean}
 */
function areDifferent(x, y) {
	if (x != null) {
		if (y == null)
			return true
		switch (x.constructor.name) {
			case "Number":
				return x !== y
			case "String":
				return x !== y
			case "Array":
				if (x.length != y.length)
					return true
				else {
					for (let i = 0; i < x.length; i++)
						if (areDifferent(x[i], y[i]))
							return true
				}
				return false
		}
	}
	return true
}

/**
 * @param {*} source 
 * @param {string|number} key 
 * @param {*} newVal 
 */
function assignVal(source, key, newVal) {
	if (newVal == null) {
		source[key] = newVal
		return
	}

	switch (newVal.constructor.name) {
		default:
			source[key] = newVal
			break
		case "Array":
			source[key].length = 0
			for (let i = 0; i < newVal.length; i++)
				assignVal(source[key], i, newVal[i])
			break
		case "Object": {
			const keys = Object.keys(source[key])
			for (let i = 0; i < keys.length; i++) {
				const key1 = keys[i]
				if (key1 in newVal)
					assignVal(source[key], key1, newVal[key1])
			}
			break
		}
	}
}

/**
 * @param {*} val
 * @returns {*}
 */
function cloneVal(val) {
	if (val == undefined)
		return null
	switch (val.constructor.name) {
		case "Object":
		case "Array":
			return JSON.parse(JSON.stringify(val))
		default:
			return val
	}
}

class HistoryState {
	/**
	 * @typedef {object} HistoryStateInit
	 * @property {(forward?:boolean)=>void} restore
	 * @property {number|string} key 
	 * @property {*} source
	 */

	/**
	 * @param {HistoryStateInit} options
	 */
	constructor(options) {
		this.source = options.source
		this.key = options.key
		this.restore = options.restore
	}
}

class History {
	/**
	 * @param {number} limit 
	 */
	constructor(limit) {
		this.items = /** @type {HistoryState[]} */ ([])
		this.currentIndex = 0
		this.limit = limit || 500
	}

	/**
	 * @param {HistoryState} state 
	 */
	add(state) {
		if (this.currentIndex < this.limit)
			this.currentIndex++
		else
			this.items.shift()

		this.items[this.currentIndex - 1] = state
		this.items.length = this.currentIndex

		//console.log("Current History Length:" + this.currentIndex)
	}

	moveForward() {
		const state = this.items[this.currentIndex]
		if (state) {
			state.restore(true)
			this.currentIndex++
		}
	}

	moveBack() {
		const state = this.items[this.currentIndex - 1]
		if (state) {
			state.restore()
			this.currentIndex--
		}
	}
}

/**
 * @param {(...s:any)=>any} func 
 * @param {number} [time] 
 * @param {number} [forceExecuteTime]
 * @returns {(...s:any)=>any}
 */
function debounce(func, time = 200, forceExecuteTime = Infinity) {
	/** @type {number} */
	let timeoutID
	let elapsedTime = 0
	let previousTime = 0
	return (...args) => {
		const currentTime = new Date().getTime()
		if (previousTime)
			elapsedTime += currentTime - previousTime
		previousTime = currentTime

		clearTimeout(timeoutID)
		if (elapsedTime == 0 || elapsedTime > forceExecuteTime) {
			func.apply(this, args)
			elapsedTime = 0
		} else
			timeoutID = window.setTimeout(() => func.apply(this, args), time)
	}
}


class ControlsGroup {
	/**
	 * @typedef {object} ControlsGroupConfig
	 * @property {any} source 
	 * @property {string} prop 
	 * @property {CONTROLS_TYPES.BaseProperty} dictionary 
	 * @property {CONTROLS_TYPES.ControlsList[]} controlsList
	 * @property {HTMLElement} target
	 * @property {CONTROLS_TYPES.PopulatorMethod} populator
	 * @property {CONTROLS_TYPES.ContainerCreatorMethod} containerCreator
	 * @property {History} history
	 */

	/**
	 * @param {ControlsGroupConfig} config
	 */
	constructor(config) {
		this.containerCreator = config.containerCreator
		this.source = config.source
		this.prop = config.prop
		this.dictionary = config.dictionary
		this.controlsList = config.controlsList
		this.populator = config.populator
		this.history = config.history

		//create a master container
		const container = this.containerCreator(this.dictionary.properties[this.prop],
			config.prop, config.target)
		//master container cannot be compact
		container.parentElement.classList.remove("compact")

		for (let i = 0; i < this.source.length; i++) {
			const innerInnerTarget = this.containerCreator(this.dictionary.properties[this.prop],
				this.prop, container, i + 1)
			this.createDeleteButton(innerInnerTarget.parentElement)
			/** @type {CONTROLS_TYPES.ControlsList} */
			const innerControls = {}
			this.controlsList.push(innerControls)
			this.populator(this.dictionary.properties[this.prop], this.source[i],
				innerInnerTarget, innerControls)
		}
		if (!this.source.length)
			container.parentElement.querySelector(".controlCollapsor").classList.add("hidden")
		this.createAddButton(this.dictionary.properties[this.prop], container.parentElement)
		this.setDraggable(container, this.dictionary.onChange)
	}

	/**
	 * @param {HTMLElement} target 
	 */
	createDeleteButton(target) {
		const dictionary = this.dictionary.properties[this.prop]
		const source = this.source
		let innerTarget = target.querySelector(".controlHeader h2")
		if(dictionary.compact)
			innerTarget = target.querySelector(".controlElementsContainer")
		const deleteButton = document.createElement("button")
		innerTarget.appendChild(deleteButton)
		deleteButton.innerHTML = "-"
		deleteButton.classList.add("controlAddButton")
		const _this = this
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
			const deletedEntry = _this.onEntryRemove(deleteIndex, target, dictionary.onChange)

			if (_this.history) {
				_this.history.add(new HistoryState({
					key: deleteIndex,
					source: source,
					restore: (forward) => {
						if (forward)
							_this.onEntryRemove(deleteIndex, target, dictionary.onChange)
						else
							_this.reInsertDeletedEntry(dictionary, deletedEntry)
					}
				}))
			}
		})
	}

	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary
	 * @param {ArrayItemInfo}  entry
	 */
	reInsertDeletedEntry(dictionary, entry) {
		const insertBeforeNode = entry.target.children[entry.index]
		if (insertBeforeNode)
			entry.target.insertBefore(entry.html, insertBeforeNode)
		else
			entry.target.appendChild(entry.html)
		const changeF = dictionary.onChange
		this.source.splice(entry.index, 0, entry.item)
		this.controlsList.splice(entry.index, 0, entry.controlsList)
		entry.target.parentElement.querySelector(".controlCollapsor").classList.remove("hidden")
		changeF && changeF(null, entry)
	}

	/**
	 * @typedef {object} ArrayItemInfo
	 * @property {*} item
	 * @property {number} index
	 * @property {HTMLElement} html
	 * @property {HTMLElement} target
	 * @property {CONTROLS_TYPES.ControlsList} controlsList
	 */

	/**
	 * @param {number} index 
	 * @param {HTMLElement} target 
	 * @param {CONTROLS_TYPES.BaseProperty["onChange"]} onChange 
	 * @returns {ArrayItemInfo}
	 */
	onEntryRemove(index, target, onChange) {
		const deletedItem = this.source.splice(index, 1)[0]
		const parentElement = target.parentElement
		if (this.source.length == 0)
			target.parentElement.parentElement.querySelector(".controlCollapsor").classList.add("hidden")
		parentElement.removeChild(target)
		onChange && onChange(null, this.source)
		return {
			item: deletedItem,
			index: index,
			html: target,
			target: parentElement,
			controlsList: this.controlsList.splice(index, 1)[0]
		}
	}

	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary 
	 * @param {HTMLElement} target 
	 */
	createAddButton(dictionary, target) {
		const buttonTarget = target.querySelector(".controlHeader h2")
		const addButton = document.createElement("button")
		buttonTarget.appendChild(addButton)
		addButton.innerHTML = "+"
		addButton.classList.add("controlAddButton")
		const _this = this
		addButton.addEventListener("pointerup", function(event) {
			event.preventDefault()
			event.stopPropagation()
			/** @type {ArrayItemInfo} */
			let newEntry = {}

			//generate an entry. Just duplicate the previous element if avaiable
			if (_this.source.length)
				newEntry.item = JSON.parse(JSON.stringify(_this.source[_this.source.length - 1]))
			else {
				newEntry.item = {}
				scrapeDictionaryForDefaults(dictionary, {})
			}

			newEntry.html = _this.onEntryAdd(dictionary, newEntry.item, target)
			newEntry.index = _this.source.length - 1
			newEntry.target = /** @type {HTMLDivElement} */ (target.querySelector(".controlElementsContainer"))
			newEntry.controlsList = _this.controlsList[_this.controlsList.length - 1]

			if (_this.history) {
				_this.history.add(new HistoryState({
					key: _this.prop,
					source: _this.source,
					restore: (forward) => {
						if (forward)
							_this.reInsertDeletedEntry(dictionary, newEntry)
						else {
							const removedIndex = _this.source.indexOf(newEntry.item)
							const innerTarget = target.querySelector(".controlElementsContainer")
								.querySelectorAll(".controlContainer")[removedIndex]
							_this.onEntryRemove(removedIndex,
								/** @type {HTMLElement} */
								(innerTarget),
								dictionary.onChange)
						}
					}
				}))
			}
		})
	}

	/**
	 * @param {CONTROLS_TYPES.BaseProperty} dictionary 
	 * @param {*} newEntry 
	 * @param {HTMLElement} target
	 * @returns {HTMLElement}
	 */
	onEntryAdd(dictionary, newEntry, target) {
		this.source.push(newEntry)
		const innerTarget = /** @type {HTMLDivElement} */ (target.querySelector(".controlElementsContainer"))
		const newContainer = this.containerCreator(dictionary, this.prop,
			innerTarget, this.source.length)
		this.createDeleteButton(newContainer.parentElement)
		/** @type {CONTROLS_TYPES.ControlsList} */
		const innerControls = {}
		this.controlsList.push(innerControls)
		this.populator(dictionary, newEntry, newContainer, innerControls)
		this.setDraggable(innerTarget, dictionary.onChange)
		dictionary.onChange && dictionary.onChange(this.prop, this.source)
		const collapsorButton = target.querySelector(".controlCollapsor")
		collapsorButton.classList.remove("hidden")
		//show the created entry
		target.classList.remove("controlCollapsed")
		newContainer.parentElement.classList.remove("controlCollapsed")
		return newContainer.parentElement
	}

	/**
	 * 
	 * @param {HTMLElement} parentElement 
	 * @param {CONTROLS_TYPES.BaseProperty["onChange"]} cb
	 */
	setDraggable(parentElement, cb) {
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
			const source = this.source
			const cl = this.controlsList
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
					const removedObj = source.splice(currentPosition, 1)[0]
					source.splice(toPosition, 0, removedObj)
					const removedCL = cl.splice(currentPosition, 1)[0]
					cl.splice(toPosition, 0, removedCL)
					if (currentPosition < toPosition)
						parentElement.insertBefore(this.currentDraggedElement, element.nextSibling)
					else
						parentElement.insertBefore(this.currentDraggedElement, element)
					this.currentDraggedElement.removeAttribute("data-dragged")
					cb && cb(null, null)
				}
			}
			element.removeAttribute("draggable")
		}
	}
}

document.addEventListener("pointerup", () => currentHandle = null)