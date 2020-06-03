/* eslint-disable no-underscore-dangle */
const _ = require('lodash')
const SqlQueryBuilder = require('./sql-query-builder')

class SelectorDSL {
	constructor (query) {
		this.query = query
	}
	id () {
		return this.query.reallySelectField('id')
	}

	slug () {
		return this.query.reallySelectField('slug')
	}

	type () {
		return this.query.reallySelectField('type')
	}

	active () {
		return this.query.reallySelectField('active')
	}

	version () {
		return this.query.reallySelectField('version', (builder) => {
			builder.constant('.')
			builder.fieldFrom(this.query.aliasName, 'version_major')
			builder.constant('1')
			builder.function('COALESCE', 2)
			builder.cast('text')
			builder.fieldFrom(this.query.aliasName, 'version_minor')
			builder.constant('0')
			builder.function('COALESCE', 2)
			builder.cast('text')
			builder.fieldFrom(this.query.aliasName, 'version_patch')
			builder.constant('0')
			builder.function('COALESCE', 2)
			builder.cast('text')
			builder.function('CONCAT_WS', 4)
			builder.as('version')
		})
	}

	name () {
		return this.query.reallySelectField('name')
	}

	tags () {
		return this.query.reallySelectField('tags')
	}

	markers () {
		return this.query.reallySelectField('markers')
	}

	createdAt () {
		return this.query.reallySelectField('created_at')
	}

	linkedAt () {
		return this.query.reallySelectField('linked_at')
	}

	updatedAt () {
		return this.query.reallySelectField('updated_at')
	}

	links () {
		return this.query.reallySelectField('links', (builder) => {
			const sq = new SqlQueryBuilder()
			const linkAlias = `L${this.query.aliasName}`

			sq.constant('id')
			sq.fieldFrom(linkAlias, 'id')
			sq.constant('name')
			sq.fieldFrom(linkAlias, 'name')
			sq.constant('card')
			sq.fieldFrom(linkAlias, 'data')
			sq.cast('jsonb')
			sq.jsonPath('to')
			sq.cast('json')
			sq.jsonPath('id')
			sq.cast('uuid')
			sq.function('JSON_BUILD_OBJECT', 6)

			sq.fieldFrom(linkAlias, 'data')
			sq.cast('jsonb')
			sq.jsonPath('from')
			sq.cast('json')
			sq.jsonPath('id')
			sq.cast('uuid')
			sq.fieldFrom(this.query.aliasName, 'id')
			sq.eq()
			sq.where()

			sq.table('cards')
			sq.as(linkAlias)
			sq.from()
			sq.select()

			builder.append(sq)
			builder.as('links')
		})
	}

	requires () {
		return this.query.reallySelectField('requires')
	}

	capabilities () {
		return this.query.reallySelectField('capabilities')
	}

	data () {
		return this.query.reallySelectField('data')
	}

	genericData () {
		return this.query.reallySelectField('data')
	}
}

// A very simple wrapper around the query builder so that we can generate SQL select
// queries based on the fields selected in a GraphQL query.
module.exports = class CardQueryBuilder {
	constructor (depth = 0, builder = new SqlQueryBuilder()) {
		this.aliasName = `C${depth}`
		this.builder = builder
		this.builder.table('cards')
		this.builder.as(this.aliasName)
		this.builder.from()
		this.selectedFields = []
	}

	dsl () {
		return new SelectorDSL(this)
	}

	filterFieldByConstantValue (fieldName, value) {
		this.builder.fieldFrom(this.aliasName, fieldName)
		this.builder.constant(value)
		this.builder.eq()
		this.builder.where()
	}

	// This ensures that we only select each field once from a given card query,
	// helpful in the case where multiple GraphQL fields map to the same property
	// (eg `genericData` -> `data`).
	reallySelectField (fieldName, selector = null) {
		if (_.includes(this.selectedFields, fieldName)) {
			return this
		}
		if (typeof (selector) === 'function') {
			selector(this.builder)
		} else {
			this.builder.fieldFrom(this.aliasName, fieldName)
		}
		this.selectedFields.push(fieldName)
		return this
	}

	getSelectQuery () {
		this.builder.select()
		return this.builder
	}
}
