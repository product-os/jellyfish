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
const randomstring = require('randomstring')
const _ = require('lodash')
const Worker = require('../worker')
const logger = require('../logger').getLogger(__filename)
const actionLibrary = require('../action-library')

let run = true

const getTriggerTargetType = (trigger) => {
	if (trigger.data.targetType) {
		return trigger.data.targetType
	}

	if (trigger.data.target.$eval === 'source.data.target' && _.has(trigger, [
		'data',
		'filter',
		'properties',
		'data',
		'properties',
		'target',
		'properties',
		'type',
		'const'
	])) {
		return _.get(trigger, [
			'data',
			'filter',
			'properties',
			'data',
			'properties',
			'target',
			'properties',
			'type',
			'const'
		])
	}

	return _.get(trigger, [
		'data',
		'filter',
		'properties',
		'type',
		'const'
	], {
		$eval: 'source.type'
	})
}

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

const getActorKey = async (context, jellyfish, session, actorId) => {
	const keySlug = `session-action-${actorId}`
	const key = await jellyfish.getCardBySlug(context, session, keySlug, {
		type: 'session'
	})

	if (key && key.data.actor === actorId) {
		return key
	}

	logger.info(context, 'Create worker key', {
		slug: keySlug,
		actor: actorId
	})

	return jellyfish.insertCard(context, session, jellyfish.defaults({
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

const tick = (worker, session, onError) => {
	if (!run) {
		return
	}

	tickingWorker = worker.tick({
		id: `TICK-${randomstring.generate(20)}`
	}, session, {
		currentDate: new Date()
	}).catch(onError)

	tickingWorker.then(() => {
		if (!run) {
			return
		}

		setTimeout(() => {
			tick(worker, session, onError)
		}, 2000)
	})
}

// The .processQueue() function attaches its work promise to this variable so
// that .flush() can wait for it to finish before flushing
let processingQueue = null

const processQueue = (context, jellyfish, worker, queue, session, onRequest, onError) => {
	if (!run) {
		return
	}

	processingQueue = queue.length().then((length) => {
		if (length === 0) {
			return null
		}

		return queue.dequeue().then((request) => {
			return getActorKey(context, jellyfish, session, request.actor).then((key) => {
				return worker.execute(key.id, request)
			})
		}).then(onRequest)
	}).catch(onError)

	processingQueue.then(() => {
		if (!run) {
			return
		}

		setTimeout(() => {
			processQueue(context, jellyfish, worker, queue, session, onRequest, onError)
		}, 10)
	})
}

exports.start = async (queue, context, jellyfish, session, onRequest, onError) => {
	const worker = new Worker(jellyfish, session, actionLibrary, queue)
	const triggerStream = await jellyfish.stream(context, session, SCHEMA_ACTIVE_TRIGGERS)
	triggerStream.on('error', onError)

	let refreshingTriggers = null

	const refreshTriggers = async () => {
		refreshingTriggers = jellyfish.query(context, session, SCHEMA_ACTIVE_TRIGGERS)
		const triggers = await refreshingTriggers

		logger.info(context, 'Refreshing triggers', {
			triggers: triggers.length
		})

		worker.setTriggers(context, triggers.map((trigger) => {
			const targetType = getTriggerTargetType(trigger)

			const object = {
				id: trigger.id,
				action: trigger.data.action,
				type: targetType,
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
	processQueue(context, jellyfish, worker, queue, session, onRequest, onError)
	tick(worker, session, onError)

	worker.stop = async (workerContext) => {
		await Bluebird.delay(3000)
		run = false
		triggerStream.removeAllListeners()
		triggerStream.close()
		await refreshingTriggers
		await exports.flush(workerContext, jellyfish, session, worker, queue)
		await Bluebird.delay(1000)
	}

	return worker
}

exports.flush = async (context, jellyfish, session, worker, queue) => {
	const length = await queue.length()
	logger.info(context, 'Flushing queue', {
		length
	})

	await tickingWorker
	await processingQueue

	if (length === 0) {
		return
	}

	const request = await queue.dequeue()
	const result = await worker.execute(session, request)

	if (result.error) {
		const Constructor = worker.errors[result.data.type] ||
			jellyfish.errors[result.data.type] ||
			Error

		throw new Constructor(result.data.message)
	}

	await exports.flush(context, jellyfish, session, worker, queue)
}
