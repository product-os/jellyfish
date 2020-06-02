/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const Expression = require('./expression')

module.exports = class FilterExpression extends Expression {
	constructor (expression) {
		super()
		this.expression = expression
	}

	isFilter () {
		return true
	}

	formatAsSql (wrap) {
		return this.expression.formatAsSql(wrap)
	}
}
