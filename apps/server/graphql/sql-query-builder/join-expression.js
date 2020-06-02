/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const Expression = require('./expression')
const format = require('pg-format')

module.exports = class JoinExpression extends Expression {
	constructor (table, on, attributes = null) {
		super()
		this.table = table
		this.on = on
		this.attributes = attributes
	}

	isJoin () {
		return true
	}

	formatAsSql (wrap) {
		if (this.attributes) {
			const formatString = wrap ? '(%s JOIN %s ON %s)' : '%s JOIN %s ON %s'
			return format(formatString, this.attributes, this.table.formatAsSql(), this.on.formatAsSql())
		}
		const formatString = wrap ? '(JOIN %s ON %s)' : 'JOIN %s ON %s'
		return format(formatString, this.table.formatAsSql(), this.on.formatAsSql())
	}
}
