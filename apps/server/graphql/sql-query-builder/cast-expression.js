/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */
const DelegatedExpression = require('./delegated-expression')
const format = require('pg-format')

module.exports = class CastExpression extends DelegatedExpression {
	constructor (inner, typeName) {
		super('inner')
		this.inner = inner
		this.typeName = typeName
	}

	formatAsSql (wrap) {
		const formatString = wrap ? '%s::%s' : '(%s::%s)'
		return format(formatString, this.inner.formatAsSql(true), this.typeName)
	}
}
