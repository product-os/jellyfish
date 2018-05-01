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

const Bluebird = require('bluebird')
const objectTemplate = require('object-template')
const _ = require('lodash')
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
 * @param {String} table - table
 * @param {Object} card - card
 * @returns {String} card id
 *
 * @example
 * const id = await permissionFilter.unsafeUpsertCard(backend, 'cards', {
 *   type: 'foo',
 *   links: [],
 *   tags: [],
 *   active: true,
 *   data: {
 *     foo: 'bar'
 *   }
 * })
 *
 * console.log(id)
 */
exports.unsafeUpsertCard = (backend, table, card) => {
	jsonSchema.validate(CARDS.card.data.schema, card)
	jsonSchema.validate(CARDS[card.type].data.schema, card)
	return backend.upsertElement(table, card)
}

/**
 * @summary Create a session card for an actor
 * @function
 * @public
 *
 * @param {Object} backend - backend
 * @param {String} table - table
 * @param {String} actorId - actor id
 * @param {String} title - session title
 * @returns {String} session id
 *
 * @example
 * const session = await permissionFilter.createSession(backend, 'sessions', 'user-admin', 'test')
 * console.log(session)
 */
exports.createSession = (backend, table, actorId, title) => {
	return exports.unsafeUpsertCard(backend, table, {
		slug: `session-${title}`,
		type: 'session',
		links: [],
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
 * @param {Object} buckets - card buckets
 * @param {String} buckets.user - the bucket for user cards
 * @param {String} buckets.session - the bucket for session cards
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
exports.getSessionUser = async (backend, session, buckets) => {
	const sessionCard = await backend.getElementById(buckets.session, session)
	if (!sessionCard) {
		throw new errors.JellyfishNoElement(`Invalid session: ${session}`)
	}

	if (sessionCard.data.expiration && new Date() > new Date(sessionCard.data.expiration)) {
		throw new errors.JellyfishSessionExpired(`Session expired at: ${sessionCard.data.expiration}`)
	}

	const actor = await backend.getElementById(buckets.user, sessionCard.data.actor)
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
 * @param {String} table - table
 * @param {String[]} roles - roles
 * @returns {Object[]} views
 *
 * @example
 * const views = await permissionFilter.getViews(backend, 'cards', [ 'view-resineer', 'view-user-guest' ])
 *
 * for (const view of views) {
 *   console.log(view)
 * }
 */
exports.getViews = (backend, table, roles) => {
	const CARD_TYPE = 'view'
	return Bluebird.reduce(roles, (accumulator, role) => {
		return backend.getElementBySlug(table, role)
			.then((card) => {
				if (card && card.type !== CARD_TYPE) {
					return null
				}

				return card
			})
			.then((schema) => {
				if (schema) {
					accumulator.push(schema)
				}

				return accumulator
			})
	}, [])
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

	return this.getViews(backend, options.bucket, roles)
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
 * @param {Object} options.buckets - card buckets
 * @param {String} options.buckets.user - the bucket for user cards
 * @param {String} options.buckets.session - the bucket for session cards
 * @param {String} options.buckets.view - the bucket for view cards
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
 * }, {
 *   buckets: {
 *     user: 'cards',
 *     view: 'cards',
 *     session: 'sessions'
 *   }
 * })
 */
exports.getQuery = async (backend, session, schema, options) => {
	const user = await exports.getSessionUser(backend, session, {
		session: options.buckets.session,
		user: options.buckets.user
	})

	const views = await getRoleViews(backend, user, {
		writeMode: options.writeMode,
		bucket: options.buckets.view
	})

	const filters = views.map((view) => {
		return exports.getViewSchema(view)
	})

	const finalSchema = schema.type === CARDS.view.slug ? exports.getViewSchema(schema) : schema
	filters.push(finalSchema)

	return jsonSchema.merge(_.map(filters, (filter) => {
		return objectTemplate.compile(filter, {
			user
		}, {
			delimiters: [ '\\[', '\\]' ]
		})
	}))
}
