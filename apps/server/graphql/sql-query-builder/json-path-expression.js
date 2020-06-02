const format = require('pg-format')
const DelegatedExpression = require('./delegated-expression')

module.exports = class JsonPathExpression extends DelegatedExpression {
	constructor (inner, path) {
		super('inner')
		this.inner = inner
		this.jsonPath = path.split('.')
	}

	formatAsSql (wrap) {
		const result = this.jsonPath.reduce((fragment, propertyName) => {
			return format('%s->>%L', fragment, propertyName)
		}, this.inner.formatAsSql(true))

		if (wrap) {
			return `(${result})`
		}
		return result
	}
}
