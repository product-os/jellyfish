/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
 * @param {Object} backend - backend
 * @param {Object} card - card
 * @returns {Object} card
 *
 * @example
 * const card = await permissionFilter.unsafeUpsertCard(backend, {
 *   type: 'foo',
 *   links: {},
 *   tags: [],
 *   active: true,
 *   data: {
 *     foo: 'bar'
 *   }
 * })
 *
 * console.log(card.id)
 */
exports.unsafeUpsertCard = (backend, card) => {
	jsonSchema.validate(CARDS.card.data.schema, card)
	jsonSchema.validate(CARDS[card.type].data.schema, card)
	return backend.upsertElement(card)
}

/**
 * @summary Create a session card for an actor
 * @function
 * @public
 *
 * @param {Object} backend - backend
 * @param {String} actorId - actor id
 * @param {String} title - session title
 * @returns {Object} session card
 *
 * @example
 * const session = await permissionFilter.createSession(backend, 'user-admin', 'test')
 * console.log(session.id)
 */
exports.createSession = (backend, actorId, title) => {
	return exports.unsafeUpsertCard(backend, {
		slug: `session-${title}`,
		type: 'session',
		version: '1.0.0',
		componentVersion: '1.0.0',
		capabilities: [],
		requires: {},
		links: {},
		tags: [],
		active: true,
		data: {
			actor: actorId
		}
	})
}

/**
 * @summary Get the user that corresponds to a session
 * @function
 * @private
 *
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
exports.getSessionUser = async (backend, session) => {
	const sessionCard = await backend.getElementById(session)
	if (!sessionCard) {
		throw new errors.JellyfishNoElement(`Invalid session: ${session}`)
	}

	if (sessionCard.data.expiration && new Date() > new Date(sessionCard.data.expiration)) {
		throw new errors.JellyfishSessionExpired(`Session expired at: ${sessionCard.data.expiration}`)
	}

	const actor = await backend.getElementById(sessionCard.data.actor)
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
exports.getViews = async (backend, roles) => {
	const CARD_TYPE = 'view'

	const views = await Promise.all(roles.map((role) => {
		return backend.getElementBySlug(role, {
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
 * @summary Get the views for the user's roles
 * @function
 * @private
 *
 * @param {Object} backend - backend
 * @param {Object} user - user card
 * @param {Object} [options] - options
 * @param {Boolean} [options.writeMode] - enable write mode
 * @returns {Object[]} views
 *
 * @example
 * const user = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'user-admin')
 * const views = await getRoleViews(backend, user)
 *
 * for (const view of views) {
 *   console.log(view)
 * }
 */
const getRoleViews = (backend, user, options = {}) => {
	const modes = options.writeMode ? [ 'read', 'write' ] : [ 'read' ]

	const roles = _.chain([ user.slug ])
		.concat(user.data.roles)
		.reduce((accumulator, role) => {
			Reflect.apply(accumulator.push, accumulator, _.map(modes, (mode) => {
				return `view-${mode}-${role}`
			}))

			return accumulator
		}, [])
		.value()

	return this.getViews(backend, roles)
}

/**
 * @summary Get a final filtered query
 * @function
 * @public
 *
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
exports.getQuery = async (backend, session, schema, options) => {
	const user = await exports.getSessionUser(backend, session)

	const views = await getRoleViews(backend, user, {
		writeMode: options.writeMode
	})

	const filters = views.map((view) => {
		return exports.getViewSchema(view)
	})

	if (schema) {
		const finalSchema = schema.type === CARDS.view.slug ? exports.getViewSchema(schema) : schema
		filters.push(finalSchema)
	}

	return jsonSchema.merge(_.map(filters, (filter) => {
		// If json-e encounters a property that starts with more than one
		// dollar sign, then it will remove one for some reason. The
		// only way I found to workaround this is to double escape before
		// calling json-e, so that the resulting key remains accurate.
		if (filter.$$sort) {
			filter.$$$sort = filter.$$sort
			Reflect.deleteProperty(filter, '$$sort')
		}

		return jsone(filter, {
			user
		})
	}))
}
