const format = require('pg-format')
const Expression = require('./expression')

module.exports = class FunctionExpression extends Expression {
	constructor (name, args) {
		super()
		this.name = name
		this.args = args
	}

	isQueryable () {
		return this
			.args
			.some((arg) => { return arg.isQueryable() })
	}

	isSelectable () {
		return this
			.args
			.some((arg) => { return arg.isSelectable() })
	}

	toQuery () {
		const args = this
			.args
			.map((arg) => { return arg.toQuery() })
			.join(', ')

		return format('%s(%s)', this.name, args)
	}
}
