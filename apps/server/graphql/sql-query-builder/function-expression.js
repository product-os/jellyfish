const format = require('pg-format')
const Expression = require('./expression')

module.exports = class FunctionExpression extends Expression {
	constructor (name, args) {
		super()
		this.name = name
		this.args = args
	}

	formatAsSql (_wrap) {
		const args = this
			.args
			.map((arg) => { return arg.formatAsSql(false) })
			.join(', ')

		return format('%s(%s)', this.name, args)
	}
}
