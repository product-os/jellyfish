/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const format = require('pg-format')
const Expression = require('./expression')

module.exports = class FieldExpression extends Expression {
	constructor (name, from) {
		super()
		this.fieldName = name
		this.fieldFrom = from
	}

	isSelectable () {
		return true
	}

	isField () {
		return true
	}

	formatAsSql (_wrap) {
		if (this.fieldFrom) {
			return format('%I.%I', this.fieldFrom, this.fieldName)
		}
		return format('%I', this.fieldName)
	}
}
