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
const EventEmitter = require('events').EventEmitter
const Worker = require('../worker')
const actionLibrary = require('../action-library')

let run = true
let hoistedWorker = null

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

	return jellyfish.insertCard(session, jellyfish.defaults({
		slug: keySlug,
		version: '1.0.0',
		type: 'session',
		data: {
			actor: actorId
		}
	}), {
		override: true
	})
}

// The .tick() function attaches its work promise to this variable so that
// .flush() can wait for it to finish before flushing
let tickingWorker = null

const tick = (worker, session, emitter) => {
	if (!run) {
		return
	}

	tickingWorker = worker.tick(session, {
		currentDate: new Date()
	}).catch((error) => {
		emitter.emit('error', error)
	})

	tickingWorker.then(() => {
		if (!run) {
			return
		}

		setTimeout(() => {
			tick(worker, session, emitter)
		}, 2000)
	})
}

// The .processQueue() function attaches its work promise to this variable so
// that .flush() can wait for it to finish before flushing
let processingQueue = null

const processQueue = (jellyfish, worker, session, emitter) => {
	if (!run) {
		return
	}

	processingQueue = worker.length().then((length) => {
		if (length === 0) {
			return null
		}

		return worker.dequeue().then((request) => {
			return getActorKey(jellyfish, session, request.actor).then((key) => {
				return worker.execute(key.id, request)
			})
		}).then((request) => {
			emitter.emit('request', request)
		})
	}).catch((error) => {
		emitter.emit('error', error)
	})

	processingQueue.then(() => {
		if (!run) {
			return
		}

		setTimeout(() => {
			processQueue(jellyfish, worker, session, emitter)
		}, 10)
	})
}

module.exports = class ActionServer extends EventEmitter {
	constructor (jellyfish, session) {
		super()
		this.jellyfish = jellyfish
		this.session = session
		this.worker = new Worker(jellyfish, session, actionLibrary)

		if (!hoistedWorker) {
			hoistedWorker = this.worker
		}
	}

	async start () {
		const triggerStream = await this.jellyfish.stream(
			this.session, SCHEMA_ACTIVE_TRIGGERS, {
				ctx: this.worker.getExecutionContext().execContext
			})

		triggerStream.on('error', (error) => {
			this.emit('error', error)
		})

		let refreshingTriggers = null

		const refreshTriggers = async () => {
			refreshingTriggers = this.jellyfish.query(this.session, SCHEMA_ACTIVE_TRIGGERS, {
				ctx: this.worker.getExecutionContext().execContext
			})
			const triggers = await refreshingTriggers
			this.worker.setTriggers(triggers.map((trigger) => {
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
			refreshTriggers().catch((error) => {
				this.emit('error', error)
			})
		})

		await refreshTriggers()

		run = true
		processQueue(this.jellyfish, this.worker, this.session, this)
		tick(this.worker, this.session, this)

		this.stopFn = async () => {
			run = false
			triggerStream.removeAllListeners()
			triggerStream.close()
			await refreshingTriggers
			await this.flush()
			await Bluebird.delay(1000)
		}
	}

	async stop () {
		return this.stopFn()
	}

	async flush () {
		await tickingWorker
		await processingQueue

		if (await this.worker.length() === 0) {
			return
		}

		const request = await this.worker.dequeue()
		const result = await this.worker.execute(this.session, request)

		if (result.error) {
			const Constructor = this.worker.errors[result.data.type] ||
				this.jellyfish.errors[result.data.type] ||
				Error

			throw new Constructor(result.data.message)
		}

		await this.flush()
	}
}

// TODO: These should not be part of the action
// server but static "queue" functions
module.exports.enqueue = async (session, params, context) => {
	return hoistedWorker.enqueue(session, params, context)
}

module.exports.waitResults = async (session, id) => {
	return hoistedWorker.waitResults(session, id)
}
