/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ColorHash from 'color-hash'
import jsone from 'json-e'
import * as _ from 'lodash'
import moment from 'moment'
import path from 'path'
import {
	SchemaSieve
} from 'rendition'
import skhema from 'skhema'

export const createPermaLink = (card) => {
	return `${window.location.origin}/${card.id}`
}

export const slugify = (value) => {
	return value
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

export const pathWithoutChannel = (channel) => {
	const filtered = Reflect.apply(path.join, null, window.location.pathname.split('/').filter((part) => {
		const identifier = part.split('...')[0]
		return identifier !== channel.data.target
	}))

	return `/${filtered}`
}

export const appendToChannelPath = (channel, card) => {
	const parts = []
	const pieces = window.location.pathname.split('/')
	const target = _.get(channel, [ 'data', 'target' ])

	for (const piece of pieces) {
		parts.push(piece)
		if (target === piece.split('...')[0]) {
			break
		}
	}

	parts.push(card.slug || card.id)

	const route = Reflect.apply(path.join, null, parts)

	return `/${route}`
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
export const getCurrentTimestamp = () => {
	const currentDate = new Date()
	return currentDate.toISOString()
}

export const getTypeFromViewCard = (card) => {
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

export const formatTimestamp = _.memoize((stamp, prefix = false) => {
	const momentDate = moment(stamp)
	const today = isToday(momentDate)
	const dateText = today
		? momentDate.format('HH:mm')
		: momentDate.format('MMM Do, YYYY HH:mm')
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

export const timeAgo = (stamp) => {
	return moment(stamp).fromNow()
}

export const findUsernameById = (users, id) => {
	const actor = _.find(users, {
		id
	})
	return actor
		? actor.slug.replace('user-', '')
		: 'unknown user'
}

// Only consider objects with $eval
const evalSchema = (object, context) => {
	if (!object) {
		return object
	}

	if (object.$eval) {
		return jsone(object, context)
	}

	if (object.$id) {
		Reflect.deleteProperty(object, '$id')
	}

	for (const key of Object.keys(object)) {
		// For performance reasons
		// eslint-disable-next-line lodash/prefer-lodash-typecheck
		if (typeof object[key] !== 'object') {
			continue
		}

		object[key] = evalSchema(object[key], context)
	}

	return object
}

/**
 * @summary Get the schema of a view card
 * @function
 *
 * @param {Object} card - view card
 * @param {Object} user - user card
 * @returns {(Object|Null)} schema
 *
 * @example
 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'view-all')
 * const schema = permissionFilter.getViewSchema(card)
 * console.log(schema)
 */
export const getViewSchema = (card, user) => {
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

	const view = skhema.merge(conjunctions, {
		resolvers: {
			$$links: (values) => {
				return _.merge(values[0], values[1])
			}
		}
	})

	return evalSchema(view, {
		user
	})
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
export const getUpdateObjectFromSchema = (schema) => {
	const update = {}
	_.forEach(schema.properties, (value, key) => {
		if (value.const) {
			update[key] = value.const
		}
		if (value.contains && value.contains.const) {
			update[key] = [ value.contains.const ]
		}
		if (value.type === 'object') {
			update[key] = getUpdateObjectFromSchema(value)
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
export const getLocalSchema = (card) => {
	return _.get(card, [ 'data', '$$localSchema' ]) || {
		type: 'object',
		properties: {}
	}
}

export const createPrefixRegExp = _.memoize((prefix) => {
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
export const findWordsByPrefix = (prefix, source) => {
	const regExp = createPrefixRegExp(prefix)
	return _.compact(source.match(regExp))
}

/**
 * @summary match usernames using a prefix and map them to ids
 *
 * @param {String} prefix - The prefix used to indicate a username
 * @param {String} source - The text to analyse
 *
 * @returns {String[]} An array of mathched user ids
 */
export const getUserSlugsByPrefix = (prefix, source) => {
	const words = findWordsByPrefix(prefix, source)

	return _.uniq(words.map((name) => {
		return name.trim().replace(prefix, 'user-')
	}))
}

export const getObjectValues = (input) => {
	if (_.isPlainObject(input)) {
		const result = _.map(input, (value) => {
			return getObjectValues(value)
		})
		return _.filter(_.flatten(result), _.isString)
	}

	return input
}

export const getViewSlices = (view, types) => {
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

export const regexEscape = (str) => {
	return str.replace(matchOperatorsRe, '\\$&')
}

export const createFullTextSearchFilter = (schema, term) => {
	const flatSchema = SchemaSieve.flattenSchema(schema)
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
							pattern: regexEscape(term),
							flags: 'i'
						}
					}
				},
				required: [ key ]
			}
		})
	}
	const unflattenedSchema = SchemaSieve.unflattenSchema(filter)
	return unflattenedSchema
}

export const removeUndefinedArrayItems = (input) => {
	if (_.isArray(input)) {
		return input.filter(_.negate(_.isUndefined))
	}
	if (_.isPlainObject(input)) {
		return _.mapValues(input, removeUndefinedArrayItems)
	}
	return input
}

export const colorHash = _.memoize((input) => {
	return new ColorHash().hex(input)
})

export const getCreator = async (getActorFn, card) => {
	const createCard = _.find(_.get(card.links, [ 'has attached element' ], []), {
		type: 'create'
	})
	const actor = await getActorFn(_.get(createCard, [ 'data', 'actor' ]))
	return actor
}

export const getLastUpdate = (card) => {
	const sorted = _.sortBy(
		_.get(card.links, [ 'has attached element' ], []),
		'data.timestamp'
	)
	return _.last(sorted)
}
