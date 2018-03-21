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

exports.waitForMatch = async (jellyfish, schema) => {
	const stream = await jellyfish.stream(schema, {
		inactive: true
	})

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

exports.waitForRequestResults = async (jellyfish, requestId) => {
	const request = await jellyfish.getCard(requestId)
	if (!request) {
		return null
	}

	if (request.data.executed) {
		return request.data.result || null
	}

	// TODO: This should be parameterized view
	const requestMatch = await exports.waitForMatch(jellyfish, {
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

exports.getTimeline = async (jellyfish, id, options) => {
	const card = await jellyfish.getCard(id, options)
	if (!card) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown id: ${id}`)
	}

	// TODO: If views could be parameterized, then
	// this function could call .queryView() instead
	return jellyfish.query({
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

exports.queryView = async (jellyfish, viewId) => {
	const viewCard = await jellyfish.getCard(viewId)
	if (!viewCard || viewCard.type !== 'view') {
		throw new jellyfish.errors.JellyfishNoView(`Unknown view: ${viewId}`)
	}

	return jellyfish.query(await jellyfish.getSchema(viewId))
}
