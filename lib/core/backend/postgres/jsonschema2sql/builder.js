/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')

const CARD_FIELDS = {
	id: {
		required: true,
		type: 'string'
	},
	version: {
		required: true,
		type: 'string'
	},
	slug: {
		required: true,
		type: 'string'
	},
	type: {
		required: true,
		type: 'string'
	},
	tags: {
		required: true,
		type: 'array',
		items: 'string'
	},
	markers: {
		required: true,
		type: 'array',
		items: 'string'
	},
	name: {
		required: false,
		type: 'string'
	},
	links: {
		required: true,
		type: 'object'
	},
	created_at: {
		required: true,
		type: 'string'
	},
	active: {
		required: true,
		type: 'boolean'
	},
	requires: {
		required: true,
		type: 'array',
		items: 'object'
	},
	capabilities: {
		required: true,
		type: 'array',
		items: 'object'
	},
	data: {
		required: true,
		type: 'object'
	}
}

exports.valueToPostgres = (value) => {
	return pgFormat.literal(value)
}

exports.getProperty = (property, options = {}) => {
	if (property.length < 2) {
		return null
	}

	const root = property[0]
		? `${property[0]}.${property[1]}`
		: property[1]

	if (property.length === 2) {
		return root
	}

	const body = [
		root
	].concat(_.initial(property.slice(2)).map((fragment) => {
		if (_.isNumber(fragment)) {
			return fragment
		}

		return exports.valueToPostgres(fragment)
	})).join('->')

	const last = _.last(property)

	return [
		body,
		_.isNumber(last) ? last : exports.valueToPostgres(last)
	].join(options.text ? '->>' : '->')
}

exports.isRootProperty = (property) => {
	return property.length <= 1 && Boolean(property[0])
}

exports.isTopLevelProperty = (property) => {
	return property.length === 2
}

exports.isPrefixedProperty = (property) => {
	return Boolean(property[0])
}

exports.isColumn = (property) => {
	return exports.isTopLevelProperty(property) &&
		exports.isPrefixedProperty(property) &&
		Boolean(CARD_FIELDS[property[1]])
}

exports.isRequiredColumn = (property) => {
	return exports.isColumn(property) &&
		CARD_FIELDS[property[1]].required
}

exports.columnIsOfType = (property, type) => {
	return exports.isColumn(property) &&
		CARD_FIELDS[property[1]].type === type
}

exports.isOfType = (property, type) => {
	if (property.length === 0) {
		return false
	}

	if (exports.isRootProperty(property) && type === 'object') {
		return true
	}

	if (exports.isColumn(property)) {
		if (exports.columnIsOfType(property, type)) {
			return true
		}

		return false
	}

	const path = exports.getProperty(property)

	// JSONB doesn't support integers so we need to do some
	// extra validation for this type.
	if (type === 'integer') {
		return exports.and(
			`jsonb_typeof(${path}) = 'number'`,
			`(${path})::text::numeric % 1 = 0`)
	}

	return `jsonb_typeof(${path}) = '${type}'`
}

exports.isNotOfType = (property, type) => {
	if (property.length === 0) {
		return true
	}

	if (exports.isRootProperty(property) && type === 'object') {
		return false
	}

	if (exports.isColumn(property)) {
		if (exports.columnIsOfType(property, type)) {
			return false
		}

		return true
	}

	const path = exports.getProperty(property)

	// JSONB doesn't support integers so we need to do some
	// extra validation for this type.
	if (type === 'integer') {
		return exports.or(
			`jsonb_typeof(${path}) != 'number'`,
			`(${path})::text::numeric % 1 != 0`)
	}

	return `jsonb_typeof(to_jsonb(${path})) != '${type}'`
}

exports.exists = (property) => {
	if (exports.isRequiredColumn(property)) {
		return true
	}

	const path = exports.getProperty(property)
	if (!path) {
		return false
	}

	return `${path} IS NOT NULL`
}

exports.notExists = (property) => {
	if (exports.isRequiredColumn(property)) {
		return false
	}

	const path = exports.getProperty(property)
	if (!path) {
		return true
	}

	return `${path} IS NULL`
}

exports.and = (...conjuncts) => {
	const result = []

	for (const conjunct of conjuncts) {
		if (conjunct === true) {
			continue
		}

		if (!conjunct) {
			return false
		}

		result.push(conjunct)
	}

	if (result.length === 0) {
		return true
	}

	if (result.length === 1) {
		return result[0]
	}

	return result.map((conjunct) => {
		return `(${conjunct})`
	}).join('\nAND\n')
}

exports.or = (...disjuncts) => {
	if (disjuncts.length === 0) {
		return true
	}

	const result = []
	for (const disjunct of disjuncts) {
		if (disjunct === false) {
			continue
		}

		if (disjunct === true) {
			return true
		}

		result.push(disjunct)
	}

	if (result.length === 0) {
		return false
	}

	if (result.length === 1) {
		return result[0]
	}

	return result.map((disjunct) => {
		return `(${disjunct})`
	}).join('\nOR\n')
}

exports.not = (expression) => {
	if (_.isBoolean(expression)) {
		return !expression
	}

	return `NOT (${expression})`
}

exports.noneObject = (property, expression) => {
	if (!expression) {
		return false
	}

	return [
		`NOT EXISTS (SELECT 1 FROM jsonb_each(${exports.getProperty(property)})`,
		`WHERE (${expression}))`
	].join('\n')
}

exports.someArray = (property, schema, walk) => {
	if (exports.isColumn(property)) {
		const expression = walk(schema, [ null, 'unnest' ], CARD_FIELDS[property[1]])
		return [
			`EXISTS (SELECT 1 FROM UNNEST(${exports.getProperty(property)})`,
			`WHERE (${expression}))`
		].join('\n')
	}

	const expression = walk(schema, [ null, 'value' ])
	return [
		`EXISTS (SELECT 1 FROM jsonb_array_elements(${exports.getProperty(property)})`,
		`WHERE (${expression}))`
	].join('\n')
}

exports.everyArray = (property, schema, walk) => {
	if (exports.isColumn(property)) {
		const expression = exports.not(
			walk(schema, [ null, 'unnest' ], CARD_FIELDS[property[1]]))
		return [
			`NOT EXISTS (SELECT 1 FROM UNNEST(${exports.getProperty(property)})`,
			`WHERE (${expression}))`
		].join('\n')
	}

	const expression = exports.not(walk(schema, [ null, 'value' ]))
	return [
		`NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${exports.getProperty(property)})`,
		`WHERE (${expression}))`
	].join('\n')
}

exports.keys = (property) => {
	return `ARRAY(SELECT jsonb_object_keys(${exports.getProperty(property)}))`
}
