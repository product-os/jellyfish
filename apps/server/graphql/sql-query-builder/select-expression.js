/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const format = require('pg-format')
const Expression = require('./expression')

module.exports = class SelectExpression extends Expression {
	constructor (expressions) {
		super()
		this.expressions = expressions
	}

	isSelectable () {
		return true
	}

	isQueryable () {
		return true
	}

	toQuery () {
		const fields = this
			.expressions
			.filter((expr) => { return expr.isSelectable() })
			.map((expr) => { return expr.toQuery() })
			.join(', ')

		const froms = this
			.expressions
			.filter((expr) => { return expr.isQueryable() })
			.map((expr) => { return expr.toQuery() })
			.join(', ')

		if (fields.length === 0) {
			throw new Error('Select query contains no fields')
		}

		if (froms.length === 0) {
			return format('SELECT %s', fields)
		}

		return format('SELECT %s FROM %s', fields, froms)
	}
}
