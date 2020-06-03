/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

const {
	snakeCase
} = require('change-case')

// Special case the selection of the `version` field, as it's really a
// composite.
const buildVersionFieldSelect = function () {
	this.builder.constant('.')
	this.builder.fieldFrom(this.alias, 'version_major')
	this.builder.constant('1')
	this.builder.function('COALESCE', 2)
	this.builder.cast('text')
	this.builder.fieldFrom(this.alias, 'version_minor')
	this.builder.constant('0')
	this.builder.function('COALESCE', 2)
	this.builder.cast('text')
	this.builder.fieldFrom(this.alias, 'version_patch')
	this.builder.constant('0')
	this.builder.function('COALESCE', 2)
	this.builder.cast('text')
	this.builder.function('CONCAT_WS', 4)
}

module.exports = class BaseCardQueryGenerator {
	constructor (depth) {
		this.depth = depth
		this.alias = `C${depth}`
	}

	prepare () {
		return null
	}

	selectField (name) {
		switch (name) {
			case 'version':
				Reflect.apply(buildVersionFieldSelect, this, [])
				break

			case 'genericData':
				this.builder.fieldFrom(this.alias, 'data')
				break

			case 'links':
				break

			default:
				this.builder.fieldFrom(this.alias, snakeCase(name))
		}
	}

	finalise () {
		return null
	}
}
