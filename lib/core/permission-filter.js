/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const jsone = require('json-e')
const _ = require('lodash')
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const assert = require('../assert')

const CARD_CARD_TYPE = `${CARDS.card.slug}@${CARDS.card.version}`
const VERSIONED_CARDS = _.mapKeys(CARDS, (value, key) => {
	return `${key}@${value.version}`
})

const applyMarkers = async (context, backend, user, schema) => {
	// TODO: Find a way to implement this logic without
	// hardcoding the admin user
	if (user.slug === CARDS['user-admin'].slug) {
		return schema
	}

	/*
	 * Be careful if modifying this schema as it has been
	 * written so that the backend can be smart about it
	 * and execute it really fast.
	 */
	const orgs = await backend.query(context, {
		type: 'object',
		$$links: {
			'has member': {
				type: 'object',
				required: [ 'type', 'slug' ],
				properties: {
					type: {
						type: 'string',
						const: 'user@1.0.0'
					},
					slug: {
						type: 'string',
						const: user.slug
					}
				}
			}
		},
		required: [ 'slug', 'type' ],
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'org@1.0.0'
			}
		}
	})

	const markers = _.uniq([ user, ...orgs ].map((card) => {
		return card.slug
	}))

	const markersQuery = markers.length === 0
		// If there are no markers provided, only elements with
		// no markers are valid
		? {
			type: 'array',
			maxItems: 0
		}
		: {
			type: 'array',
			items: {
				type: 'string',
				anyOf: [
					{
						enum: markers
					},

					// Use pattern matching to allow content using compound markers
					// (markers join with a + symbol)
					{
						pattern: `(^|\\+)(${markers.join('|')})($|\\+)`
					}
				]
			}
		}

	// The markers must match
	if (schema.properties && schema.properties.markers) {
		schema.allOf = schema.allOf || []
		schema.allOf.push({
			type: 'object',
			required: [ 'markers' ],
			properties: {
				markers: markersQuery
			}
		})
	} else {
		schema.properties = schema.properties || {}
		schema.properties.markers = markersQuery
	}

	return schema
}

/**
 * @summary Upsert a card in an unsafe way (DANGEROUS)
 * @function
 * @public
 *
 * @description
 * This bypasses the whole permission system, so use with care.
 *
 * This function has the added limitation that you can only insert
 * cards of types that are defined in the Jellyfish core.
 *
 * @param {Object} context - exectuion context
 * @param {Object} backend - backend
 * @param {Object} card - card
 * @returns {Object} card
 *
 * @example
 * const card = await permissionFilter.unsafeUpsertCard(backend, {
 *   type: 'foo',
 *   links: {},
 *   requires: [],
 *   capabilities: [],
 *   tags: [],
 *   active: true,
 *   data: {
 *     foo: 'bar'
 *   }
 * })
 *
 * console.log(card.id)
 */
exports.unsafeUpsertCard = async (context, backend, card) => {
	jsonSchema.validate(VERSIONED_CARDS[CARD_CARD_TYPE].data.schema, card)
	jsonSchema.validate(VERSIONED_CARDS[card.type].data.schema, card)
	return backend.upsertElement(context, card)
}

/**
 * @summary Get the user that corresponds to a session
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {String} session - session id
 * @returns {Object} user card
 */
exports.getSessionUser = async (context, backend, session) => {
	const sessionCard = await backend.getElementById(context, session, {
		type: 'session'
	})

	assert.USER(context, sessionCard, errors.JellyfishInvalidSession,
		`Invalid session: ${session}`)

	assert.USER(context,
		!sessionCard.data.expiration ||
		new Date() <= new Date(sessionCard.data.expiration),
		errors.JellyfishSessionExpired,
		`Session expired at: ${sessionCard.data.expiration}`)

	const actor = await backend.getElementById(
		context, sessionCard.data.actor, {
			type: 'user@1.0.0'
		})

	assert.INTERNAL(context, actor, errors.JellyfishNoElement,
		`Invalid actor: ${sessionCard.data.actor}`)

	return actor
}

/**
 * @summary Get the filter schemas for the user's roles
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {Object} user - user card
 * @returns {Object[]} role schemas
 */
const getRoleViews = async (context, backend, user) => {
	const viewSchemas = []

	for (const role of [ user.slug, ...user.data.roles ]) {
		const roleCard = await backend.getElementBySlug(
			context, `role-${role}@1.0.0`, {
				type: 'role@1.0.0'
			})

		if (!roleCard) {
			continue
		}

		viewSchemas.push(roleCard.data.read)
	}

	// A default schema that will not match anything
	if (viewSchemas.length === 0) {
		viewSchemas.push({
			type: 'object',
			additionalProperties: false
		})
	}

	return viewSchemas
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

const getUserMask = async (context, backend, user) => {
	const permissionFilters = await getRoleViews(context, backend, user)
	return applyMarkers(context, backend, user, {
		type: 'object',

		// At least one permission must match
		anyOf: permissionFilters.map((object) => {
			return evalSchema(object, {
				user
			})
		})
	})
}

/**
 * @summary Get the permissions mask for a user
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {String} session - session id
 * @returns {Object} mask
 */
exports.getMask = async (context, backend, session) => {
	return getUserMask(context, backend,
		await exports.getSessionUser(context, backend, session))
}

/**
 * @summary Get a final filtered query
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {String} session - session id
 * @param {Object} schema - query schema
 * @returns {Object} query
 */
exports.getQuery = async (context, backend, session, schema) => {
	const user = await exports.getSessionUser(context, backend, session)
	const mask = await getUserMask(context, backend, user)

	// Apply permission mask to links
	for (const linkName in schema.$$links) {
		if (schema.$$links[linkName]) {
			schema.$$links[linkName] =
				jsonSchema.merge([ mask, schema.$$links[linkName] ])

			// Recursive `$$links` not supported, so remove them because
			// they are most likely being added by the mask
			Reflect.deleteProperty(schema.$$links[linkName], '$$links')
		}
	}

	return jsonSchema.merge([
		mask,
		evalSchema(schema, {
			user
		})
	], {
		// Resolvers are custom functions called by the `merge()` function to
		// merge specific keywords. Because the format of the `$$links`
		// property is not a valid schema we need a resolver for that
		resolvers: {
			// To merge `$$links`, we want to merge link types that are defined
			// in the query schema plus add all other unconstrained links in the
			// query. But we don't want to add link types from the `mask` to the
			// final query as it changes the meaning of the query itself
			$$links: ([ maskLinks, schemaLinks ], path, mergeSchemas) => {
				const merged = {}
				for (const verb in schemaLinks) {
					const maskLink = maskLinks[verb]
					const schemaLink = schemaLinks[verb]
					if (maskLink) {
						// Avoid adding recursive `$$links` from permissions to
						// queries
						Reflect.deleteProperty(maskLink, '$$links')

						merged[verb] = mergeSchemas([ maskLink, schemaLink ])
					} else {
						merged[verb] = schemaLink
					}
				}

				return merged
			}
		}
	})
}
