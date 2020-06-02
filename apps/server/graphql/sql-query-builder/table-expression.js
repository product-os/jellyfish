/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const Expression = require('./expression')
const format = require('pg-format')

module.exports = class TableExpression extends Expression {
	constructor (tableName) {
		super()
		this.tableName = tableName
	}

	isQueryable () {
		return true
	}

	formatAsSql (_wrap) {
		return format('%I', this.tableName)
	}
}
