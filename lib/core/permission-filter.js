/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsone = require('json-e')
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const assert = require('../assert')

const applyMarkersToSchema = (schema, user, markersQuery) => {
	// The admin user can access all cards regardless of markers, allowing the
	// admin user to insert cards that have markers already set. As such, the
	// markers query should not be added if the user-admin is running the query.
	// TODO: Find a way to implement this logic without hardcoding the user-admin
	// slug
	if (user.slug !== 'user-admin') {
		// The markers must match
		if (schema.properties && schema.properties.markers) {
			if (!schema.allOf) {
				schema.allOf = []
			}
			schema.allOf.push(markersQuery)
		} else {
			schema.properties = schema.properties || {}
			schema.properties.markers = markersQuery.properties.markers
		}
	}

	return schema
}

const getMarkers = async (context, backend, user) => {
	// We don't care about admin's markers as we treat this
	// as a special case anyways.
	if (user.slug === 'user-admin') {
		return []
	}

	/*
	 * Be careful if modifying this schema as is has been
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
						const: 'user'
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
				const: 'org'
			}
		}
	})

	return orgs.reduce((accumulator, org) => {
		accumulator.push(org.slug)
		return accumulator
	}, [ user.slug ])
}

const createMarkersQuery = async (context, backend, user) => {
	const markers = await getMarkers(context, backend, user)

	// If there are no markers provided, only elements with no markers are valid
	if (markers.length === 0) {
		return {
			type: 'object',
			properties: {
				markers: {
					type: 'array',
					maxItems: 0
				}
			}
		}
	}

	return {
		type: 'object',
		properties: {
			markers: {
				type: 'array',
				items: {
					type: 'string',
					anyOf: [
						// Use pattern matching to allow content using compound markers
						// (markers join with a + symbol)
						{
							pattern: `(^|\\+)(${markers.join('|')})($|\\+)`
						},
						{
							enum: _.uniq(markers)
						}
					]
				}
			}
		}
	}
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
	jsonSchema.validate(CARDS.card.data.schema, card)
	jsonSchema.validate(CARDS[card.type].data.schema, card)
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

	const actor = await backend.getElementById(context, sessionCard.data.actor, {
		type: 'user'
	})

	assert.INTERNAL(context, actor, errors.JellyfishNoElement,
		`Invalid actor: ${sessionCard.data.actor}`)

	return actor
}

/**
 * @summary Get the schema of a view card
 * @function
 * @private
 *
 * @param {Object} card - view card
 * @returns {(Object|Null)} schema
 */
exports.getViewSchema = (card) => {
	if (!card) {
		return null
	}

	if (card.data && card.data.schema) {
		return card.data.schema
	}

	if (card.type === 'role' && card.data && card.data.read) {
		return card.data.read
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

	return jsonSchema.merge(conjunctions)
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
				type: 'role'
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
	const user = await exports.getSessionUser(context, backend, session)
	const [ permissionFilters, markersQuery ] = await Promise.all([
		getRoleViews(context, backend, user),
		createMarkersQuery(context, backend, user)
	])

	return applyMarkersToSchema({
		type: 'object',

		// At least one permission must match
		anyOf: permissionFilters.map((object) => {
			return evalSchema(object, {
				user
			})
		})
	}, user, markersQuery)
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
	const [ permissionFilters, markersQuery ] = await Promise.all([
		getRoleViews(context, backend, user),
		createMarkersQuery(context, backend, user)
	])

	const compiledSchema = {
		type: 'object',

		// At least one permission must match
		anyOf: permissionFilters.map((object) => {
			return evalSchema(object, {
				user
			})
		})
	}

	if (schema.$$links) {
		const linkName = Object.keys(schema.$$links)[0]

		if (schema.$$links[linkName]) {
			schema.$$links[linkName] = jsonSchema.merge([
				schema.$$links[linkName],
				compiledSchema
			])

			applyMarkersToSchema(schema.$$links[linkName], user, markersQuery)
		}
	}

	const finalSchema = schema.type === CARDS.view.slug
		? exports.getViewSchema(schema)
		: schema
	const evaledSchema = evalSchema(finalSchema, {
		user
	})
	if (evaledSchema.anyOf) {
		compiledSchema.allOf = [
			{
				anyOf: evaledSchema.anyOf
			}
		]
	}

	Object.assign(compiledSchema, _.omit(evaledSchema, [ 'anyOf' ]))
	return applyMarkersToSchema(compiledSchema, user, markersQuery)
}
