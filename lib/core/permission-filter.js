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
 *
 * @example
 * const user = await permissionFilter.getSessionUser(backend, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
 *   user: 'cards',
 *   session: 'sessions'
 * })
 *
 * console.log(user.data.email)
 */
exports.getSessionUser = async (context, backend, session) => {
	const sessionCard = await backend.getElementById(context, session, {
		type: 'session'
	})
	if (!sessionCard) {
		const error = new errors.JellyfishInvalidSession(
			`Invalid session: ${session}`)
		error.expected = true
		throw error
	}

	if (sessionCard.data.expiration &&
		new Date() > new Date(sessionCard.data.expiration)) {
		const error = new errors.JellyfishSessionExpired(
			`Session expired at: ${sessionCard.data.expiration}`)
		error.expected = true
		throw error
	}

	const actor = await backend.getElementById(context, sessionCard.data.actor, {
		type: 'user'
	})
	if (!actor) {
		throw new errors.JellyfishNoElement(`Invalid actor: ${sessionCard.data.actor}`)
	}

	return actor
}

/**
 * @summary Get a set of views given a set of roles
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {String[]} roles - roles
 * @returns {Object[]} views
 *
 * @example
 * const views = await permissionFilter.getViews(backend, [ 'view-resineer', 'view-user-guest' ])
 *
 * for (const view of views) {
 *   console.log(view)
 * }
 */
exports.getViews = async (context, backend, roles) => {
	const CARD_TYPE = 'view'

	const views = await Promise.all(roles.map((role) => {
		return backend.getElementBySlug(context, role, {
			type: CARD_TYPE
		})
	}))

	const result = []

	for (const view of views) {
		if (view && view.type === CARD_TYPE) {
			result.push(view)
		}
	}

	return result
}

/**
 * @summary Get the schema of a view card
 * @function
 * @private
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

	return jsonSchema.merge(conjunctions)
}

/**
 * @summary Get the view schemas for the user's roles
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {Object} user - user card
 * @param {Object} [options] - options
 * @param {Boolean} [options.writeMode] - enable write mode
 * @returns {Object[]} view schemas
 *
 * @example
 * const user = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'user-admin')
 * const views = await getRoleViews(backend, user)
 *
 * for (const view of views) {
 *   console.log(view)
 * }
 */
const getRoleViews = async (context, backend, user, options = {}) => {
	const modes = options.writeMode ? [ 'read', 'write' ] : [ 'read' ]

	const viewSchemas = []

	const roles = [ user.slug, ...user.data.roles ]

	for (const role of roles) {
		const modeRoles = modes.map((mode) => {
			return `view-${mode}-${role}`
		})

		const viewCards = await exports.getViews(context, backend, modeRoles)

		const views = viewCards.map((card) => {
			return exports.getViewSchema(card)
		})

		// If there is a read and write view for a role, they should be evaluated
		// using AND, making write mode more restrictive in scope
		if (views.length > 1) {
			viewSchemas.push({
				allOf: views
			})
		} else if (views.length) {
			viewSchemas.push(views[0])
		}
	}

	return viewSchemas
}

/**
 * @summary Create a query that filters element by a set of markers
 * @function
 * @private
 *
 * @description Creates a schema that is valid if every marker on the element is
 * present in the provided array of markers
 *
 * @param {String[]} markers - An array of markers
 *
 * @returns {Object} query
 *
 * @example
 * const markers = [ 'user-johndoe', 'org-balena' ]
 * const markersQuery = createMarkersQuery(markers)
 */
const createMarkersQuery = (markers) => {
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
 * @summary Get a final filtered query
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {String} session - session id
 * @param {Object} schema - query schema
 * @param {Object} options - options
 * @param {Boolean} [options.writeMode] - enable write mode
 * @returns {Object} query
 *
 * @example
 * const user = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'user-admin')
 * const query = await permissionFilter.getQuery(backend, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
 *   type: 'object',
 *   properties: {
 *			slug: {
 *			  type: 'string',
 *			  const: 'user-admin'
 *			}
 *   }
 * })
 */
exports.getQuery = async (context, backend, session, schema, options) => {
	const user = await exports.getSessionUser(context, backend, session)

	const evalFn = (object) => {
		return evalSchema(object, {
			user
		})
	}

	const permissionFilters = await getRoleViews(context, backend, user, {
		writeMode: options.writeMode
	})

	// Users must have a role view to be able to access anything
	if (permissionFilters.length === 0) {
		throw new errors.JellyfishPermissionsError('User must have at least 1 role or permission view')
	}

	const userMarkers = await backend.getUserMarkers(context, user)

	const markersQuery = createMarkersQuery(userMarkers)

	const compiledSchema = {
		type: 'object',
		properties: {},

		// At least one permission must match
		anyOf: permissionFilters.map(evalFn)
	}

	if (schema) {
		const finalSchema = schema.type === CARDS.view.slug ? exports.getViewSchema(schema) : schema
		const evaledSchema = evalFn(finalSchema)
		if (evaledSchema.anyOf) {
			compiledSchema.allOf = [
				{
					anyOf: evaledSchema.anyOf
				}
			]
		}

		Object.assign(compiledSchema, _.omit(evaledSchema, [ 'anyOf' ]))
	}

	// The admin user can access all cards regardless of markers, allowing the
	// admin user to insert cards that have markers already set. As such, the
	// markers query should not be added if the user-admin is running the query.
	// TODO: Find a way to implement this logic without hardcoding the user-admin
	// slug
	if (user.slug !== 'user-admin') {
		// The markers must match
		if (compiledSchema.properties.markers) {
			if (!compiledSchema.allOf) {
				compiledSchema.allOf = []
			}
			compiledSchema.allOf.push(markersQuery)
		} else {
			compiledSchema.properties.markers = markersQuery.properties.markers
		}
	}

	return compiledSchema
}
