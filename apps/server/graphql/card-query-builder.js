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

	/*

	{
		"to": {
			"id": "9b195558-2eb9-4a66-839d-bb4f724faf55",
			"type": "action-request@1.0.0"
		},
	 "from": {
		 "id": "3143d7ea-327a-4b0a-98fc-5cf4ff290fa8",
		 "type": "execute@1.0.0"
		},
	 "inverseName": "is executed by"}

	 SELECT L.name, L.data->to->id AS card_id FROM cards AS L WHERE L.data->from->id = 'id'
	*/

	links () {
		return this.query.reallySelectField('links', (builder) => {
			// L.name
			builder.fieldFrom('L', 'name')
			builder.as('link_name')

			// L.data->to->id
			builder.fieldFrom('L', 'data')
			builder.cast('jsonb')
			builder.jsonPath('to')
			builder.cast('json')
			builder.jsonPath('id')
			builder.cast('uuid')
			builder.as('link_card_to_id')

			builder.table('cards')
			builder.as('L')

			builder.fieldFrom('L', 'data')
			builder.cast('jsonb')
			builder.jsonPath('from')
			builder.cast('json')
			builder.jsonPath('id')
			builder.cast('uuid')
			builder.fieldFrom(this.query.aliasName, 'id')
			builder.eq()
			builder.leftJoin()
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
