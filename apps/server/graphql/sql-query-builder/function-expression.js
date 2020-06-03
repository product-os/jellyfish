/* eslint-disable class-methods-use-this */

const Expression = require('./expression')
const format = require('pg-format')

module.exports = class FunctionExpression extends Expression {
	constructor (name, args) {
		super()
		this.name = name
		this.args = args
	}

	isSelectable () {
		return true
	}

	formatAsSql (_wrap) {
		const args = this
			.args
			.map((arg) => { return arg.formatAsSql(true) })
			.join(', ')

		return format('%s(%s)', this.name, args)
	}
}
