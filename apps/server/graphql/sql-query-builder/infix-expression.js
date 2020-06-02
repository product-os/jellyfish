const format = require('pg-format')
const Expression = require('./expression')

module.exports = class InfixExpression extends Expression {
	constructor (op, lhs, rhs) {
		super()
		this.op = op
		this.lhs = lhs
		this.rhs = rhs
	}

	formatAsSql (wrap) {
		const formatString = wrap ? '(%s %s %s)' : '%s %s %s'
		return format(formatString, this.lhs.formatAsSql(true), this.op, this.rhs.formatAsSql(true))
	}
}
