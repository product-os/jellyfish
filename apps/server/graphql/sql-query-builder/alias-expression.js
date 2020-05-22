const format = require('pg-format')
const Expression = require('./expression')

module.exports = class AliasExpression extends Expression {
	constructor (inner, alias) {
		super()
		this.inner = inner
		this.alias = alias
	}

	isSelectable () {
		return this.inner.isSelectable()
	}

	isQueryable () {
		return this.inner.isQueryable()
	}

	toQuery () {
		return format('%s AS %I', this.inner.toQuery(), this.alias)
	}
}
