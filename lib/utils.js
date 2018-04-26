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

const Bluebird = require('bluebird')

exports.waitForMatch = async (jellyfish, session, schema) => {
	const stream = await jellyfish.stream(session, schema)

	let results = null

	stream.on('data', (change) => {
		results = change.after
		stream.close()
	})

	return new Bluebird((resolve, reject) => {
		stream.on('error', reject)
		stream.on('closed', () => {
			resolve(results)
		})
	})
}

exports.waitForRequestResults = async (jellyfish, session, requestId) => {
	const request = await jellyfish.getCardById(session, requestId)
	if (!request) {
		return null
	}

	if (request.data.executed) {
		return request.data.result || null
	}

	// TODO: This should be parameterized view
	const requestMatch = await exports.waitForMatch(jellyfish, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'action-request'
			},
			id: {
				type: 'string',
				const: requestId
			},
			data: {
				type: 'object',
				properties: {
					executed: {
						type: 'boolean',
						const: true
					},
					result: {
						type: 'object',
						additionalProperties: true
					}
				},
				required: [ 'executed', 'result' ]
			}
		},
		required: [ 'type', 'id', 'data' ]
	})

	return requestMatch.data.result
}

exports.getTimeline = async (jellyfish, session, id, options) => {
	const card = await jellyfish.getCardById(session, id, options)
	if (!card) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown id: ${id}`)
	}

	// TODO: If views could be parameterized, then
	// this function could call .queryView() instead
	return jellyfish.query(session, {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					target: {
						type: 'string',
						const: card.id
					}
				},
				additionalProperties: true,
				required: [ 'target' ]
			}
		},
		additionalProperties: true,
		required: [ 'data' ]
	}, options)
}

exports.queryView = async (jellyfish, session, viewId) => {
	const viewCard = await jellyfish.getCardById(session, viewId)
	if (!viewCard || viewCard.type !== 'view') {
		throw new jellyfish.errors.JellyfishNoView(`Unknown view: ${viewId}`)
	}

	return jellyfish.query(session, viewCard)
}

exports.executeAndWaitAction = async (jellyfish, session, worker, options) => {
	const sessionCard = await jellyfish.getCardById(session, session)

	if (!sessionCard) {
		throw new jellyfish.errors.JellyfishNoElement('Invalid session')
	}

	const actor = await jellyfish.getCardById(session, sessionCard.data.actor, {
		writeMode: true
	})
	if (!actor) {
		throw new jellyfish.errors.JellyfishNoElement(`Invalid actor: ${sessionCard.data.actor}`)
	}

	options.actorId = actor.id

	const id = await worker.createRequest(session, options)
	const results = await exports.waitForRequestResults(jellyfish, session, id)

	return {
		id,
		results
	}
}

exports.login = async (jellyfish, session, worker, options) => {
	const user = await jellyfish.getCardBySlug(jellyfish.sessions.admin, `user-${options.username}`, {
		writeMode: true
	})

	if (!user) {
		throw new jellyfish.errors.JellyfishNoElement(`Invalid user: ${options.username}`)
	}

	if (!options.password) {
		return exports.executeAndWaitAction(jellyfish, session, worker, {
			targetId: user.id,
			action: 'action-create-session',
			arguments: {
				password: {}
			}
		})
	}

	return exports.executeAndWaitAction(jellyfish, session, worker, {
		targetId: user.id,
		action: 'action-create-session',
		transient: {
			password: options.password
		},
		arguments: {
			password: {
				hash: `{{ HASH(properties.transient.password, '${user.data.password.salt}') }}`
			}
		}
	})
}

/**
 * @summary Deserialize query params objects sent from the client
 * @description Since all query parameter values become strings, we escape the
 * strings that are sent to the server in an extra set of quotes, this function
 * normalizes values from strings to their actual primitives
 * @function
 * @public
 *
 * @param {*} query - The query data
 *
 * @returns {*} - The deserialized query data
 *
 * @example
 * const data = deserialize({
 *   type: '\'object\'',
 *   additionalProperties: 'true',
 *   maxProperties: '5',
 * })
 *
 * console.log(data)
 * // --> { type: 'object', additionalProperties: true, maxProperties: 5 }
 *
 */
const deserializeQuery = (query) => {
	if (!_.isObject(query)) {
		// Check if the query is a string
		if (_.startsWith(query, '\'') && _.endsWith(query, '\'')) {
			return _.trim(query, '\'')
		}

		// Check if the query is a boolean
		if (query === 'true') {
			return true
		}
		if (query === 'false') {
			return false
		}

		// Check if the query is Null
		if (query === 'null') {
			return null
		}

		// Check if the query is undefined
		if (query === 'undefined') {
			// eslint-disable-next-line no-undefined
			return undefined
		}

		if (query === 'NaN') {
			return NaN
		}

		const numericValue = _.toNumber(query)

		if (!_.isNaN(numericValue)) {
			return numericValue
		}

		return query
	}

	// Cloning null always returns null
	if (query === null) {
		return null
	}

	// If we're cloning an array, use an array as the base, otherwise use an object
	const clonedQuery = Array.isArray(query) ? [] : {}

	_.forEach(query, (item, key) => {
		// Recursively clone eack item
		clonedQuery[key] = deserializeQuery(item)
	})

	return clonedQuery
}

exports.deserializeQuery = deserializeQuery
