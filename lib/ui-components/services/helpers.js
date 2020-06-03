/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ColorHash from 'color-hash'
import emoji from 'node-emoji'
import clone from 'deep-copy'
import * as jsonpatch from 'fast-json-patch'
import jsone from 'json-e'
import * as _ from 'lodash'
import moment from 'moment'
import path from 'path'
import {
	SchemaSieve
} from 'rendition'
import skhema from 'skhema'
import {
	DetectUA
} from 'detect-ua'

export const urlBase64ToUint8Array = (base64String) => {
	const padding = '='.repeat((4 - base64String.length % 4) % 4)
	const base64 = (base64String + padding)
		.replace(/-/g, '+')
		.replace(/_/g, '/')

	const rawData = window.atob(base64)
	const outputArray = new Uint8Array(rawData.length)

	for (let index = 0; index < rawData.length; ++index) {
		outputArray[index] = rawData.charCodeAt(index)
	}
	return outputArray
}

export const createPermaLink = (card) => {
	return `${window.location.origin}/${card.id}`
}

export const slugify = (value) => {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

export const isCustomView = (view, user) => {
	return view.slug.startsWith('view-user-created-view') && view.markers.length === 1 && view.markers[0] === user.slug
}

export const pathWithoutTarget = (target) => {
	const filtered = Reflect.apply(path.join, null, window.location.pathname.split('/').filter((part) => {
		const identifier = part.split('...')[0]
		return identifier !== target
	}))

	return `/${filtered}`
}

export const pathWithoutChannel = (channel) => {
	return pathWithoutTarget(channel.data.target)
}

export const appendToChannelPath = (channel, card) => {
	const parts = []
	const	pieces = window.location.pathname.split('/')
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

export const getTypeFromViewCard = (card) => {
	// Default to the `card` type, which will give a sensible schema
	let value = 'card'

	// First check if the view has explicitly declared a type
	if (!_.isEmpty(card.data.types)) {
		return _.first(card.data.types)
	}
	if (card.data.allOf) {
		for (const item of card.data.allOf) {
			let found = _.get(item.schema, [ 'properties', 'type', 'const' ]) ||
				_.get(item.schema, [ 'properties', 'type', 'enum', 0 ])
			if (found) {
				value = found
				break
			}
			if (item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = _.get(subschema, [ 'properties', 'type', 'const' ]) ||
						_.get(subschema, [ 'properties', 'type', 'enum', 0 ])
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
			const found = _.get(item.schema, [ 'properties', 'type', 'const' ]) ||
				_.get(item.schema, [ 'properties', 'type', 'enum', 0 ])
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

// Only consider objects with $eval
export const evalSchema = (object, context) => {
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

export const replaceEmoji = (messageText) => {
	return emoji.emojify(messageText, (missing) => {
		return `:${missing}:`
	})
}

export const createPrefixRegExp = (prefix) => {
	const regExp = new RegExp(`(\\s|^)((${prefix})[a-z\\d-_\\/]+(\\.[a-z\\d-_\\/]+)*)`, 'gmi')
	return regExp
}

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
	return _.invokeMap(_.compact(source.match(regExp)), 'trim')
}

/**
 * @summary match keys using a prefix and map them to the keys themselves
 *
 * @param {String} prefix - The prefix used to indicate a key
 * @param {String} source - The text to analyse
 * @param {String} replacement - The string to replace the prefix with
 *
 * @returns {String[]} An array of matched keys
 */
export const getSlugsByPrefix = (prefix, source, replacement = '') => {
	const words = findWordsByPrefix(prefix, source)

	return _.uniq(words.map((name) => {
		return name.trim().replace(prefix, replacement)
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
			return _.get(def.schema, [ 'properties', 'type', 'const' ]) ||
				_.get(def.schema, [ 'properties', 'type', 'enum', 0 ])
		})
		.compact()
		.first()
		.value()
	const viewType = viewTypeSlug && _.find(types, {
		slug: viewTypeSlug.split('@')[0]
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

// TODO normalize this with the text search created by Rendition Filters
export const createFullTextSearchFilter = (schema, term) => {
	const flatSchema = SchemaSieve.flattenSchema(schema)
	const stringKeys = _.reduce(flatSchema.properties, (carry, item, key) => {
		if (item.type === 'string' || (_.isArray(item.type) && _.includes(item.type, 'string'))) {
			carry.push({
				key,
				fullTextSearch: Boolean(item.fullTextSearch)
			})
		}
		return carry
	}, [])

	// A schema that matches applies the pattern to each schema field with a type
	// of 'string'
	const filter = {
		type: 'object',
		additionalProperties: true,
		description: `Any field contains ${term}`,
		anyOf: stringKeys.map(({
			key, fullTextSearch
		}) => {
			const searchFields = fullTextSearch ? {
				fullTextSearch: {
					term
				}
			} : {
				regexp: {
					pattern: regexEscape(term),
					flags: 'i'
				}
			}
			return {
				type: 'object',
				properties: {
					[key]: {
						type: 'string',
						...searchFields
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

/**
 * @summary convert any string to a integer between 0 and a chosen maximum.
 *
 * @param {String} string - input string
 * @param {Integer} max - limit the number to this maximum
 *
 * @returns {Integer} number between 0 and maximum
 */
export const stringToNumber = function (string, max) {
	let hash = 0
	for (let index = 0; index < string.length; index++) {
		// eslint-disable-next-line no-bitwise
		hash = string.charCodeAt(index) + ((hash << 5) - hash)
	}

	// eslint-disable-next-line no-bitwise
	return (hash >> (string.length * 8)) & max
}

// Get the actor from the create event if it is available, otherwise use the
// first message creator
export const getCreator = async (getActorFn, card) => {
	const timeline = _.sortBy(_.get(card.links, [ 'has attached element' ], []), 'data.timestamp')
	let createCard = _.find(timeline, {
		type: 'create@1.0.0'
	}) || _.find(timeline, {
		type: 'create'
	})
	if (!createCard) {
		createCard = _.find(timeline, {
			type: 'message@1.0.0'
		}) || _.find(timeline, {
			type: 'message'
		})
	}
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

export const patchPath = (card, keyPath, value) => {
	const patch = jsonpatch.compare(card, _.set(
		clone(card),
		keyPath,
		value
	))

	return patch
}

/**
 * Returns a dictionary of user status options, keyed by
 * the user status value. For example:
 * {
 *   DoNotDisturb: {
 *     title: 'Do Not Disturb',
 *     value: 'DoNotDisturb'
 *   },
 *   {
 *     ...
 *   }
 * }
 */
export const getUserStatuses = _.memoize((userType) => {
	const userStatusOptionsList = _.get(
		userType,
		[ 'data', 'schema', 'properties', 'data', 'properties', 'status', 'oneOf' ],
		[]
	)
	return _.reduce(userStatusOptionsList, (opts, opt) => {
		if (_.has(opt, [ 'properties', 'value', 'const' ])) {
			opts[opt.properties.value.const] = {
				title: opt.properties.title.const,
				value: opt.properties.value.const
			}
		}
		return opts
	}, {})
})

export const getActorIdFromCard = _.memoize((card) => {
	let actorId = _.get(card, [ 'data', 'actor' ])
	if (!actorId) {
		const createCard = _.find(_.get(card, [ 'links', 'has attached element' ]), (linkedCard) => {
			return [ 'create', 'create@1.0.0' ].includes(linkedCard.type)
		})
		actorId = _.get(createCard, [ 'data', 'actor' ])
	}
	return actorId
}, (card) => { return card.id })

export const generateActorFromUserCard = (card) => {
	if (!card) {
		return null
	}

	/* Get user name to display with priorities:
	 * 1. profile.name
	 * 2. card name or slug substring if user is balena org member
	 * 3. [card name or handle]
	 * 4. [email(s)]
	 * 5. [card slug substring]
	*/
	const profileName = _.get(card, [ 'data', 'profile', 'name' ])
	const email = _.get(card, [ 'data', 'email' ], '')

	const isBalenaOrgMember = _.find(
		_.get(card, [ 'links', 'is member of' ], []),
		{
			slug: 'org-balena'
		}
	)

	let name = 'unknown user'
	if (profileName && (profileName.first || profileName.last)) {
		name = _.compact([ profileName.first, profileName.last ]).join(' ')
	} else if (isBalenaOrgMember) {
		name = card.name || card.slug.replace('user-', '')
	} else {
		let handle = card.name || _.get(card, [ 'data', 'handle' ])
		if (!handle) {
			if (email && email.length) {
				handle = _.isArray(email) ? email.join(', ') : email
			} else {
				handle = card.slug.replace(/^(account|user)-/, '')
			}
		}
		name = `[${handle}]`
	}

	return {
		name,
		email,
		avatarUrl: _.get(card, [ 'data', 'avatar' ]),

		// IF proxy is true, it indicates that the actor has been created as a proxy
		// for a real user in JF, usually as a result of syncing from an external
		// service
		proxy: !isBalenaOrgMember,
		card
	}
}

export const swallowEvent = (event) => {
	event.preventDefault()
	event.stopPropagation()
}

export const getRelationshipTargetType = _.memoize((relationship) => {
	const type = _.get(relationship, [ 'type' ]) || _.get(relationship, [ 'query', 0, 'type' ])
	return type && type.split('@')[0]
})

export const getType = _.memoize((typeSlug, types) => {
	return _.find(types, {
		slug: typeSlug.split('@')[0]
	})
})

export const userDisplayName = (user) => {
	return user.name || user.slug.replace('user-', '')
}

export const getMessageMetaData = (message) => {
	return {
		mentionsUser: getSlugsByPrefix('@', message, 'user-'),
		alertsUser: getSlugsByPrefix('!', message, 'user-'),
		mentionsGroup: getSlugsByPrefix('@@', message),
		alertsGroup: getSlugsByPrefix('!!', message),
		tags: findWordsByPrefix('#', message).map((tag) => {
			return tag.slice(1).toLowerCase()
		})
	}
}

export const px = (val) => {
	return (typeof val === 'number' ? `${val}px` : val)
}

export const isiOS = () => {
	// If we don't have a window or navigator object, we just assume Android
	// TODO: Refactor unit test setup code to import browser-env prior to any other code
	//       - this will allow us to ensure that window and navigator are always set - and
	//        set them to whatever we want to test (e.g. test iOS behavior as well!)
	if (typeof window !== 'object' || typeof navigator !== 'object') {
		return false
	}
	return new DetectUA().isiOS
}
