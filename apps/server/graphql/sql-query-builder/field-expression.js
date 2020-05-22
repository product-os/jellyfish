/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const format = require('pg-format')
const Expression = require('./expression')

module.exports = class FieldExpression extends Expression {
	constructor (name) {
		super()
		this.fieldName = name
	}

	isSelectable () {
		return true
	}

	toQuery () {
		return format('%I', this.fieldName)
	}
}
