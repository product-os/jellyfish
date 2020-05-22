const SqlQueryBuilder = require('./sql-query-builder')

// A very simple wrapper around the query builder so that we can generate SQL select
// queries based on the fields selected in a GraphQL query.
module.exports = class CardQuery {
	constructor (builder = new SqlQueryBuilder()) {
		this.builder = builder
		this.builder.from('cards')
	}

	id () {
		this.builder.field('id')
		return this
	}

	slug () {
		this.builder.field('slug')
		return this
	}

	type () {
		this.builder.field('type')
		return this
	}

	active () {
		this.builder.field('active')
		return this
	}

	version () {
		this.builder.const('.')
		this.builder.field('version_major')
		this.builder.const('1')
		this.builder.function('COALESCE', 2)
		this.builder.field('version_minor')
		this.builder.const('0')
		this.builder.function('COALESCE', 2)
		this.builder.field('version_patch')
		this.builder.const('0')
		this.builder.function('COALESCE', 2)
		this.builder.function('CONCAT_WS', 4)
		this.builder.as('version')
		return this
	}

	name () {
		this.builder.field('name')
		return this
	}

	tags () {
		this.builder.field('tags')
		return this
	}

	markers () {
		this.builder.field('markers')
		return this
	}

	createdAt () {
		this.builder.field('created_at')
		return this
	}

	linkedAt () {
		this.builder.field('linked_at')
		return this
	}

	updatedAt () {
		this.builder.field('updated_at')
		return this
	}

	links () {
		this.builder.field('links')
		return this
	}

	requires () {
		this.builder.field('requires')
		return this
	}

	capabilities () {
		this.builder.field('capabilities')
		return this
	}

	data () {
		this.builder.field('data')
		return this
	}

	toQuery () {
		this.builder.select()
		return this.builder.toQuery()
	}
}
