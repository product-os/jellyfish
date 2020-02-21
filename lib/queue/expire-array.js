/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const assert = require('assert')
const _ = require('lodash')

module.exports = class ExpireArray {
	constructor (timeout) {
		this.elements = []
		this.insertionDates = []
		this.timeout = timeout
		this.privNextGC = null
	}

	push (element) {
		this.elements.push(element)
		this.insertionDates.push(new Date())
		assert.equal(this.elements.length, this.insertionDates.length)
		this.privScheduleGC()
	}

	includes (element) {
		return _.includes(this.elements, element)
	}

	privScheduleGC () {
		if (this.privNextGC) {
			return
		}
		if (!this.insertionDates.length) {
			return
		}

		this.privNextGC = setTimeout(() => {
			this.privGC()
		}, this.timeout)
	}

	privGC () {
		const now = new Date()
		let deleteCount = 0
		for (let idx = 0; idx <= this.insertionDates.length && now - this.insertionDates[idx] > this.timeout; idx++) {
			deleteCount++
		}
		this.elements.splice(0, deleteCount)
		this.insertionDates.splice(0, deleteCount)
		assert.equal(this.elements.length, this.insertionDates.length)
		this.privNextGC = null
		this.privScheduleGC()
	}
}
