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
const Worker = require('../worker')
const actionLibrary = require('../action-library')

let run = true

const SCHEMA_ACTIVE_TRIGGERS = {
	type: 'object',
	properties: {
		id: {
			type: 'string'
		},
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
	required: [ 'id', 'active', 'type', 'data' ]
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
		version: '1.0.0',
		type: 'session',
		active: true,
		links: {},
		markers: [],
		tags: [],
		data: {
			actor: actorId
		}
	}, {
		override: true
	})
}

const tick = (worker, session, onError) => {
	worker.tick(session, {
		currentDate: new Date()
	}).catch(onError).then(() => {
		if (!run) {
			return
		}

		setTimeout(() => {
			tick(worker, session, onError)
		}, 2000)
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
		if (!run) {
			return
		}

		setTimeout(() => {
			processQueue(jellyfish, worker, session, onRequest, onError)
		}, 10)
	})
}

exports.start = async (jellyfish, session, onRequest, onError) => {
	const worker = new Worker(jellyfish, session, actionLibrary)
	const triggerStream = await jellyfish.stream(session, SCHEMA_ACTIVE_TRIGGERS)
	triggerStream.on('error', onError)

	const refreshTriggers = async () => {
		const triggers = await jellyfish.query(session, SCHEMA_ACTIVE_TRIGGERS)
		worker.setTriggers(triggers.map((trigger) => {
			const object = {
				id: trigger.id,
				action: trigger.data.action,
				card: trigger.data.target,
				arguments: trigger.data.arguments
			}

			if (trigger.data.filter) {
				object.filter = trigger.data.filter
			}

			if (trigger.data.interval) {
				object.interval = trigger.data.interval
			}

			return object
		}))
	}

	triggerStream.on('data', () => {
		refreshTriggers().catch(onError)
	})

	await refreshTriggers()

	run = true
	processQueue(jellyfish, worker, session, onRequest, onError)
	tick(worker, session, onError)

	worker.stop = async () => {
		run = false
		triggerStream.removeAllListeners()
		triggerStream.close()
		await exports.flush(jellyfish, session, worker)
		await Bluebird.delay(1000)
	}

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

	await exports.flush(jellyfish, session, worker)
}
