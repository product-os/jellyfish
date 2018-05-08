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

exports.waitForMatch = async (jellyfish, session, schema) => {
	const stream = await jellyfish.stream(session, schema)

	let results = null

	stream.on('data', (change) => {
		results = change.after
		stream.close()
	})

	// Once the stream is initialised, run another query in case the request was
	// processed whilst the stream was starting up
	jellyfish.query(session, schema)
		.then(([ card ]) => {
			if (card) {
				results = card
				stream.close()
			}
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
