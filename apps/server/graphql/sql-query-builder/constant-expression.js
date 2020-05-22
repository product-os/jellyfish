/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const format = require('pg-format')
const Expression = require('./expression')

module.exports = class ConstantExpression extends Expression {
	constructor (value) {
		super()
		this.value = value
	}

	isSelectable () {
		return true
	}

	toQuery () {
		return format('%L', this.value)
	}
}
