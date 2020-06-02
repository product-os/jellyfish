const DelegatedExpression = require('./delegated-expression')
const format = require('pg-format')

module.exports = class AliasExpression extends DelegatedExpression {
	constructor (inner, alias) {
		super('inner')
		this.inner = inner
		this.alias = alias
	}

	formatAsSql (_wrap) {
		return format('%s AS %I', this.inner.formatAsSql(true), this.alias)
	}
}
