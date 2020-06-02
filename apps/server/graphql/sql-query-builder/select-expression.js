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

	formatAsSql (wrap) {
		const selectables = this
			.expressions
			.filter((expr) => { return expr.isSelectable() })
			.map((expr) => { return expr.formatAsSql() })
			.join(', ')

		const froms = this
			.expressions
			.filter((expr) => { return expr.isFrom() })
			.map((expr) => { return expr.formatAsSql() })
			.join(', ')

		const joins = this
			.expressions
			.filter((expr) => { return expr.isJoin() })
			.map((expr) => { return expr.formatAsSql() })
			.join(' ')

		const filters = this
			.expressions
			.filter((expr) => { return expr.isFilter() })
			.map((expr) => { return expr.formatAsSql() })
			.join(' AND ')

		if (selectables.length === 0) {
			throw new Error('Select query contains no selectables')
		}

		let result = format('SELECT %s', selectables)
		if (froms.length > 0) {
			result = format('%s FROM %s', result, froms)
		}
		if (joins.length > 0) {
			result = format('%s %s', result, joins)
		}
		if (filters.length > 0) {
			result = format('%s WHERE %s', result, filters)
		}

		if (wrap) {
			return `(${result})`
		}

		return result
	}
}
