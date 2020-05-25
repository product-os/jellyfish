const format = require('pg-format')
const Expression = require('./expression')

module.exports = class InfixExpression extends Expression {
	constructor (op, lhs, rhs) {
		super()
		this.op = op
		this.lhs = lhs
		this.rhs = rhs
	}

	toQuery () {
		return format('%s %s %s', this.lhs.toQuery(), this.op, this.rhs.toQuery())
	}
}
