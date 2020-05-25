/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const format = require('pg-format')
const Expression = require('./expression')

module.exports = class FilterExpression extends Expression {
	constructor (expression) {
		super()
		this.expression = expression
	}

	isFilter () {
		return true
	}

	toQuery () {
		return this.expression.toQuery()
	}
}
