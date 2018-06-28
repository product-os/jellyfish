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
const errors = require('../../lib/actions/errors')

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
			type: {
				type: 'string',
				not: {
					const: 'action-request'
				}
			},
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
		required: [ 'type', 'data' ]
	}, options)
}

const waitForRequests = async (worker, retries = 10) => {
	if (retries === 0) {
		throw new Error('Could not flush requests')
	}

	const requests = await worker.getPendingRequests()
	if (requests.length === 0) {
		return
	}

	await Bluebird.delay(1000)
	await waitForRequests(worker, retries - 1)
}

const waitForRequest = async (session, worker, jellyfish, request) => {
	await waitForRequests(worker)
	const result = await jellyfish.getCardById(session, request.id)
	if (!result.data.executed) {
		await Bluebird.delay(200)
		return waitForRequest(session, worker, jellyfish, request)
	}

	return result
}

exports.executeAction = async (session, worker, jellyfish, options) => {
	const pendingRequest = await worker.createRequest(session, options)
	const request = await waitForRequest(session, worker, jellyfish, pendingRequest)
	if (!request.data.result.error) {
		return request.data.result.data
	}

	const Constructor = jellyfish.errors[request.data.result.data.type] ||
		errors[request.data.result.data.type]
	throw new Constructor(request.data.result.data.message)
}
