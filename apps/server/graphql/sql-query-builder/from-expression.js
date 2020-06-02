/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const Expression = require('./expression')

module.exports = class FromExpression extends Expression {
	constructor (expressions) {
		super()
		this.expressions = expressions
	}

	isFrom () {
		return true
	}

	isQueryable () {
		return true
	}

	formatAsSql (wrap) {
		return this.expressions
			.map((expression) => { return expression.formatAsSql(wrap) })
			.join(', ')
	}
}
