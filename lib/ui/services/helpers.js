
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ColorHash = require('color-hash')
const _ = require('lodash')
const moment = require('moment')
const rendition = require('rendition')
const skhema = require('skhema')
const uuid = require('uuid/v4')
const PURPLE = '#8268c5'

exports.debug = (...params) => {
	console.log('%cjellyfish:ui', `color: ${PURPLE};`, ...params)
}

exports.createChannel = (data = {}) => {
	const id = uuid()
	if (!data.hasOwnProperty('canonical')) {
		data.canonical = true
	}
	return {
		id,
		created_at: new Date().toISOString(),
		slug: `channel-${id}`,
		type: 'channel',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		active: true,
		data
	}
}

/**
 * @summary Get the current timestamp
 * @function
 * @public
 *
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = helpers.getCurrentTimestamp()
 */
exports.getCurrentTimestamp = () => {
	const currentDate = new Date()
	return currentDate.toISOString()
}
exports.getTypeFromViewCard = (card) => {
	// Default to the `card` type, which will give a sensible schema
	let value = 'card'

	// First check if the view has explicitly declared a type
	if (!_.isEmpty(card.data.types)) {
		return _.first(card.data.types)
	}
	if (card.data.allOf) {
		for (const item of card.data.allOf) {
			let found = _.get(item.schema, [ 'properties', 'type', 'const' ])
			if (found) {
				value = found
				break
			}
			if (item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = _.get(subschema, [ 'properties', 'type', 'const' ])
					if (found) {
						break
					}
				}
			}
			if (found) {
				value = found
				break
			}
		}
	}
	if (!value && card.data.oneOf) {
		for (const item of card.data.allOf) {
			const found = _.get(item.schema, [ 'properties', 'type', 'const' ])
			if (found) {
				value = found
				break
			}
		}
	}
	return value
}
const TODAY = moment().startOf('day')
const isToday = (momentDate) => {
	return momentDate.isSame(TODAY, 'd')
}
exports.formatTimestamp = _.memoize((stamp, prefix = false) => {
	const momentDate = moment(stamp)
	const today = isToday(momentDate)
	const dateText = today
		? momentDate.format('k:mm')
		: momentDate.format('MMM Do, YYYY k:mm')
	if (!prefix) {
		return dateText
	}
	return `${today ? 'at' : 'on'} ${dateText}`
}, (stamp, prefix) => {
	if (prefix) {
		return stamp + prefix
	}
	return stamp
})
exports.timeAgo = (stamp) => {
	return moment(stamp).fromNow()
}
exports.findUsernameById = (users, id) => {
	const actor = _.find(users, {
		id
	})
	return actor
		? actor.slug.replace('user-', '')
		: 'unknown user'
}

/**
 * @summary Get the schema of a view card
 * @function
 *
 * @param {Object} card - view card
 * @returns {(Object|Null)} schema
 *
 * @example
 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'view-all')
 * const schema = permissionFilter.getViewSchema(card)
 * console.log(schema)
 */
exports.getViewSchema = (card) => {
	if (!card) {
		return null
	}
	const conjunctions = _.map(_.get(card, [ 'data', 'allOf' ]), 'schema')
	const disjunctions = _.map(_.get(card, [ 'data', 'anyOf' ]), 'schema')
	if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
		return null
	}
	if (!_.isEmpty(disjunctions)) {
		conjunctions.push({
			anyOf: disjunctions
		})
	}
	return skhema.merge(conjunctions)
}

/**
 * @summary Parse a schema to produce an update object
 * @function
 * @description Is able to parse `const` and `contains` keywords.
 * The `contains` keyword is only parsed if it contains a `const` keyword, in
 * which case it will produce an array containing a single item.
 *
 * @param {Object} schema - A JSON schema
 * @returns {(Object)} An update object
 *
 * @example
 * const schema = {
 * 	type: 'object',
 * 	properties: {
 * 		number: {
 * 			const: 1
 * 		}
 * 	}
 * }
 * const update = getUpdateObjectFromSchema(schema)
 * console.log(update) //--> { number: 1 }
 */
exports.getUpdateObjectFromSchema = (schema) => {
	const update = {}
	_.forEach(schema.properties, (value, key) => {
		if (value.const) {
			update[key] = value.const
		}
		if (value.contains && value.contains.const) {
			update[key] = [ value.contains.const ]
		}
		if (value.type === 'object') {
			update[key] = exports.getUpdateObjectFromSchema(value)
		}
	})
	return update
}

/**
 * @summary Retrieve a localSchema from a card
 * @function
 *
 * @param {Object} card - A card object
 * @returns {Object} A JSON schema
 */
exports.getLocalSchema = (card) => {
	return _.get(card, [ 'data', '$$localSchema' ]) || {
		type: 'object',
		properties: {}
	}
}
exports.createPrefixRegExp = _.memoize((prefix) => {
	const regExp = new RegExp(`(\\s|^)([${prefix}][a-z\\d-_\\/]+)`, 'gmi')
	return regExp
})

/**
 * @summary match words prefixed with a specific value
 *
 * @param {String} prefix - The prefix used
 * @param {String} source - The text to analyse
 *
 * @returns {String[]} An array of matching strings
 */
exports.findWordsByPrefix = (prefix, source) => {
	const regExp = exports.createPrefixRegExp(prefix)
	return _.compact(source.match(regExp))
}

/**
 * @summary match usernames using a prefix and map them to ids
 *
 * @param {String} prefix - The prefix used to indicate a username
 * @param {String} source - The text to analyse
 * @param {Object[]} users - An array of user cards
 *
 * @returns {String[]} An array of mathched user ids
 */
exports.getUserIdsByPrefix = (prefix, source, users) => {
	return _.chain(exports.findWordsByPrefix(prefix, source))
		.map((name) => {
			const slug = name.replace(prefix, 'user-')
			return _.get(_.find(users, {
				slug
			}), [ 'id' ])
		})
		.compact()
		.value()
}

/**
 * @summary Convert a string into a 32bit hashcode
 *
 * @param {String} input - The input source to hash
 *
 * @returns {Number} - A 32bit integer
 */
exports.hashCode = (input) => {
	let hash = 0
	let iteration = 0
	let character = ''
	if (input.length === 0) {
		return hash
	}
	for (iteration; iteration < input.length; iteration++) {
		character = input.charCodeAt(iteration)

		// eslint-disable-next-line no-bitwise
		hash = ((hash << 5) - hash) + character

		// Convert to 32bit integer
		// eslint-disable-next-line no-bitwise
		hash |= 0
	}
	return hash
}
exports.getObjectValues = (input) => {
	if (_.isPlainObject(input)) {
		const result = _.map(input, (value) => {
			return exports.getObjectValues(value)
		})
		return _.filter(_.flatten(result), _.isString)
	}

	return input
}
exports.getViewSlices = (view, types) => {
	let slices = null
	const viewTypeSlug = _.chain(view.data.allOf)
		.map((def) => {
			return _.get(def.schema, [ 'properties', 'type', 'const' ])
		})
		.compact()
		.first()
		.value()
	const viewType = viewTypeSlug && _.find(types, {
		slug: viewTypeSlug
	})
	if (viewType && viewType.data.slices) {
		slices = _.map(viewType.data.slices, (slice) => {
			const subSchema = _.get(viewType.data.schema, slice)
			if (!subSchema) {
				return null
			}
			const viewParam = _.chain(view.data.allOf)
				.map((def) => {
					return _.get(def.schema, slice)
				})
				.compact()
				.first()
				.value()
			if (viewParam && viewParam.const) {
				return null
			}
			const title = subSchema.title || slice.split('.').pop()
			return {
				title,
				path: slice,
				values: subSchema.enum
			}
		})
	}
	return _.compact(slices)
}
const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g

exports.regexEscape = (str) => {
	return str.replace(matchOperatorsRe, '\\$&')
}

exports.createFullTextSearchFilter = (schema, term) => {
	const flatSchema = rendition.SchemaSieve.flattenSchema(schema)
	const stringKeys = _.reduce(flatSchema.properties, (carry, item, key) => {
		if (item.type === 'string') {
			carry.push(key)
		}
		return carry
	}, [])

	// A schema that matches applies the pattern to each schema field with a type
	// of 'string'
	const filter = {
		type: 'object',
		additionalProperties: true,
		description: `Any field contains ${term}`,
		anyOf: stringKeys.map((key) => {
			return {
				type: 'object',
				properties: {
					[key]: {
						type: 'string',
						regexp: {
							pattern: exports.regexEscape(term),
							flags: 'i'
						}
					}
				},
				required: [ key ]
			}
		})
	}
	const unflattenedSchema = rendition.SchemaSieve.unflattenSchema(filter)
	return unflattenedSchema
}
exports.removeUndefinedArrayItems = (input) => {
	if (_.isArray(input)) {
		return input.filter(_.negate(_.isUndefined))
	}
	if (_.isPlainObject(input)) {
		return _.mapValues(input, exports.removeUndefinedArrayItems)
	}
	return input
}
exports.colorHash = _.memoize((input) => {
	return new ColorHash().hex(input)
})
