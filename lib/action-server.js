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

const Worker = require('./worker')

const SCHEMA_ACTIVE_TRIGGERS = {
	type: 'object',
	properties: {
		active: {
			type: 'boolean',
			const: true
		},
		type: {
			type: 'string',
			const: 'triggered-action'
		},
		data: {
			type: 'object',
			additionalProperties: true
		}
	},
	required: [ 'active', 'type', 'data' ]
}

const getActorKey = async (jellyfish, session, actorId) => {
	const keySlug = `session-action-${actorId}`
	const key = await jellyfish.getCardBySlug(session, keySlug, {
		type: 'session'
	})

	if (key && key.data.actor === actorId) {
		return key
	}

	return jellyfish.insertCard(session, {
		slug: keySlug,
		type: 'session',
		active: true,
		links: [],
		tags: [],
		data: {
			actor: actorId
		}
	}, {
		override: true
	})
}
const processQueue = (jellyfish, worker, session, onRequest, onError) => {
	worker.length().then((length) => {
		if (length === 0) {
			return null
		}

		return worker.dequeue().then((request) => {
			return getActorKey(jellyfish, session, request.actor).then((key) => {
				return worker.execute(key.id, request)
			})
		}).then(onRequest)
	}).catch(onError).then(() => {
		setTimeout(() => {
			processQueue(jellyfish, worker, session, onRequest, onError)
		}, 10)
	})
}

exports.start = async (jellyfish, session, onRequest, onError) => {
	const worker = new Worker(jellyfish, session)
	const triggerStream = await jellyfish.stream(session, SCHEMA_ACTIVE_TRIGGERS)
	triggerStream.on('error', onError)

	const refreshTriggers = async () => {
		const triggers = await jellyfish.query(session, SCHEMA_ACTIVE_TRIGGERS)
		worker.setTriggers(triggers.map((trigger) => {
			return {
				action: trigger.data.action,
				card: trigger.data.target,
				filter: trigger.data.filter,
				arguments: trigger.data.arguments
			}
		}))
	}

	triggerStream.on('data', () => {
		refreshTriggers().catch(onError)
	})

	await refreshTriggers()

	processQueue(jellyfish, worker, session, onRequest, onError)
	return worker
}

exports.flush = async (jellyfish, session, worker) => {
	if (await worker.length() === 0) {
		return
	}

	const request = await worker.dequeue()
	const result = await worker.execute(session, request)

	if (result.error) {
		const Constructor = worker.errors[result.data.type] ||
			jellyfish.errors[result.data.type] ||
			Error

		throw new Constructor(result.data.message)
	}

	await exports.flush(session)
}
