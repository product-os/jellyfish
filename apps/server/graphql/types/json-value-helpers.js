/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */
class JsonObjectRow {
	constructor (key, value) {
		this._key = key
		this._value = value
	}

	asJson () {
		const result = {}
		result[this._key] = this._value
		return JSON.stringify(result)
	}

	key () {
		return this._key.toString()
	}

	value () {
		return new JsonValue(this._value)
	}
}

class JsonObject {
	constructor (value) {
		this.value = value
	}

	asJson () {
		return JSON.stringify(this.value)
	}

	rows () {
		return Object
			.entries(this.value)
			.map(([ key, value ]) => {
				return new JsonObjectRow(key, value)
			})
	}

	length () {
		return Object.keys(this.value).length
	}

	keys () {
		return Object.keys(this.value)
	}

	values () {
		return Object
			.values(this.value)
			.map((value) => { return new JsonValue(value) })
	}
}

class JsonArray {
	constructor (values) {
		this._values = values
	}

	asJson () {
		return JSON.stringify(this._values)
	}

	values () {
		return this._values.map((value) => {
			return new JsonValue(value)
		})
	}

	length () {
		return this._values.length
	}
}

class JsonValue {
	constructor (value) {
		if (value instanceof JsonValue) {
			this.value = value.value
			return
		}
		this.value = value
	}

	isArray () {
		return Array.isArray(this.value)
	}

	isNull () {
		return this.value === null
	}

	isInteger () {
		return Number.isInteger(this.value)
	}

	isFloat () {
		return typeof (this.value) === 'number' && !this.isInteger()
	}

	isString () {
		return typeof (this.value) === 'string'
	}

	isBoolean () {
		return this.value === true || this.value === false
	}

	isObject () {
		return typeof (this.value) === 'object' && !this.isArray()
	}

	asArray () {
		if (this.isArray()) {
			return new JsonArray(this.value)
		}
		return null
	}

	asBoolean () {
		if (this.isBoolean()) {
			return this.value
		}
		return null
	}

	asFloat () {
		if (this.isFloat()) {
			return this.value
		}
		return null
	}

	asInteger () {
		if (this.isInteger()) {
			return this.value
		}
		return null
	}

	asJson () {
		return JSON.stringify(this.value)
	}

	asObject () {
		if (this.isObject()) {
			return new JsonObject(this.value)
		}
		return null
	}

	asString () {
		if (this.isString()) {
			return this.value
		}
		return null
	}

	valueType () {
		if (this.isInteger()) {
			return 'integer'
		}
		if (this.isFloat()) {
			return 'float'
		}
		if (this.isString()) {
			return 'string'
		}
		if (this.isObject()) {
			return 'object'
		}
		if (this.isArray()) {
			return 'array'
		}
		if (this.isBoolean()) {
			return 'boolean'
		}
		return 'null'
	}
}

module.exports = {
	JsonValue,
	JsonObject,
	JsonObjectRow,
	JsonArray
}
