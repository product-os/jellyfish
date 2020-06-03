const SqlQueryBuilder = require('./sql-query-builder')
const {
	snakeCase
} = require('change-case')

module.exports = class LinkQueryBuilder {
	constructor (depth, astRoot) {
		this.depth = depth
		this.astRoot = astRoot
		this.alias = `L${depth}`
		this.builder = new SqlQueryBuilder()
		this.builder.table('cards')
		this.builder.as(this.alias)
		this.builder.from()
		this.fieldCount = 0
	}

	buildForNode (node) {
		const name = node.name.value

		switch (name) {
			case 'card':
				this.builder.constant('card')
				this.builder.constant('type')
				this.builder.constant('card@1.0.0')
				this.builder.function('JSON_BUILD_OBJECT', 2)
				this.fieldCount++
				break

			default:
				this.builder.constant(name)
				this.builder.fieldFrom(this.alias, name)
				this.fieldCount++
		}

		return this
	}

	getQuery (cardAlias) {
		// Build JSON object from selections...
		this.builder.function('JSON_BUILD_OBJECT', 2 * this.fieldCount)
		this.builder.function('JSON_AGG', 1)

		// Constrain to join
		this.builder.fieldFrom(this.alias, 'data')
		this.builder.cast('jsonb')
		this.builder.jsonPath('from')
		this.builder.cast('json')
		this.builder.jsonPath('id')
		this.builder.cast('uuid')
		this.builder.fieldFrom(cardAlias, 'id')
		this.builder.eq()
		this.builder.where()

		return this.builder.select()
	}
}
