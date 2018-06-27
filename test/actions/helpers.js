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

const waitForRequests = async (context, retries = 10) => {
	if (retries === 0) {
		throw new Error('Could not flush requests')
	}

	const requests = await context.worker.getPendingRequests()
	if (requests.length === 0) {
		return
	}

	await Bluebird.delay(1000)
	await waitForRequests(context, retries - 1)
}

const waitForRequest = async (context, request) => {
	await waitForRequests(context)
	const result = await context.jellyfish.getCardById(context.session, request.id)
	if (!result.data.executed) {
		await Bluebird.delay(200)
		return waitForRequest(context, request)
	}

	return result
}

exports.executeAction = async (context, options) => {
	const pendingRequest = await context.worker.createRequest(context.session, options)
	const request = await waitForRequest(context, pendingRequest)
	if (!request.data.result.error) {
		return request.data.result.data
	}

	throw new context.jellyfish.errors[request.data.result.data.type](request.data.result.data.message)
}
