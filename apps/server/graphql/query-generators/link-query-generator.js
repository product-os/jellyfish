/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

const SqlQueryBuilder = require('../sql-query-builder')
const NestedCardQueryGenerator = require('./nested-card-query-generator')
const {
	snakeCase
} = require('change-case')

module.exports = class LinkQueryGenerator {
	constructor (depth) {
		this.depth = depth
		this.alias = `L${depth}`
		this.builder = new SqlQueryBuilder()
		this.selectedFields = new Set()
	}

	prepare () {
		return null
	}

	selectField (name) {
		if (this.selectedFields.has(name)) {
			return
		}

		switch (name) {
			case 'card':
				this.buildCardSelect()
				break

			default:
				this.builder.constant(name)
				this.builder.fieldFrom(this.alias, snakeCase(name))
				this.selectedFields.add(name)
		}
	}

	finalise () {
		this.builder.function('JSON_BUILD_OBJECT', this.selectedFields.size * 2)
		this.builder.function('JSON_AGG', 1)

		// FROM cards AS L0
		this.builder.table('cards')
		this.builder.as(this.alias)
		this.builder.from()

		// WHERE L0.type = 'link@1.0.0'
		this.builder.fieldFrom(this.alias, 'type')
		this.builder.constant('link@1.0.0')
		this.builder.eq()

		// AND C0.id = ((L0.data::jsonb->>'from')::json->>'id')::uuid
		this.builder.fieldFrom(this.parent.alias, 'id')
		this.builder.fieldFrom(this.alias, 'data')
		this.builder.cast('jsonb')
		this.builder.jsonPath('from')
		this.builder.cast('json')
		this.builder.jsonPath('id')
		this.builder.cast('uuid')
		this.builder.eq()

		this.builder.and()
		this.builder.where()
	}

	buildCardSelect () {
		const queryBuilder = new NestedCardQueryGenerator(this.depth + 1)
		queryBuilder.prepare()

		// Visit ast

		queryBuilder.finalise()
		this.builder.append(queryBuilder.builder)
	}
}
