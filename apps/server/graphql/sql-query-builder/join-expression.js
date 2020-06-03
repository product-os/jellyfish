/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const Expression = require('./expression')
const format = require('pg-format')

module.exports = class JoinExpression extends Expression {
	constructor (table, on, joinName = 'JOIN') {
		super()
		this.table = table
		this.on = on
		this.joinName = joinName
	}

	isJoin () {
		return true
	}

	formatAsSql (wrap) {
		const formatString = wrap ? '(%s %s ON %s)' : '%s %s ON %s'
		return format(formatString, this.joinName, this.table.formatAsSql(), this.on.formatAsSql())
	}
}
