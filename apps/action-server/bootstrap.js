/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const actionLibrary = require('../../lib/action-library')
const logger = require('../../lib/logger').getLogger(__filename)
const Worker = require('../../lib/worker')
const Consumer = require('../../lib/queue').Consumer
const Producer = require('../../lib/queue').Producer
const core = require('../../lib/core')
const environment = require('../../lib/environment')
const uuid = require('../../lib/uuid')

const getActorKey = async (context, jellyfish, session, actorId) => {
	const keySlug = `session-action-${actorId}`
	const key = await jellyfish.getCardBySlug(
		context, session, `${keySlug}@1.0.0`)

	if (key && key.data.actor === actorId) {
		return key
	}

	logger.info(context, 'Create worker key', {
		slug: keySlug,
		actor: actorId
	})

	const actorSession = await jellyfish.replaceCard(context, session, jellyfish.defaults({
		slug: keySlug,
		version: '1.0.0',
		type: 'session@1.0.0'
	}))
	await jellyfish.replaceCard(context, session, {
		slug: `link-${keySlug}-is-owned-by-${actorId}`,
		type: 'link@1.0.0',
		name: 'is owned by',
		data: {
			inverseName: 'owns',
			from: {
				id: actorSession.id,
				type: actorSession.type
			},
			to: {
				id: actorId,

				// TODO: find a way to make sure this is actually the case
				type: 'user@1.0.0'
			}
		}
	})

	return actorSession
}

const SCHEMA_ACTIVE_TRIGGERS = {
	type: 'object',
	properties: {
		id: {
			type: 'string'
		},
		slug: {
			type: 'string'
		},
		active: {
			type: 'boolean',
			const: true
		},
		type: {
			type: 'string',
			const: 'triggered-action@1.0.0'
		},
		data: {
			type: 'object',
			additionalProperties: true
		}
	},
	required: [ 'id', 'slug', 'active', 'type', 'data' ]
}

const bootstrap = async (context, library, options) => {
	logger.info(context, 'Setting up cache')
	const cache = new core.MemoryCache(environment.redis)
	if (cache) {
		await cache.connect(context)
	}

	logger.info(context, 'Instantiating core library')
	const jellyfish = await core.create(context, cache, {
		backend: environment.database.options
	})

	const session = jellyfish.sessions.admin
	const consumer = new Consumer(jellyfish, session)
	const producer = new Producer(jellyfish, session)

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	const worker = new Worker(
		jellyfish, session, library, consumer, producer)
	await worker.initialize(context)

	let run = true
	let refreshingTriggers = Bluebird.resolve()

	const refreshTriggers = async () => {
		refreshingTriggers = jellyfish.query(
			context, session, SCHEMA_ACTIVE_TRIGGERS)
		const triggers = await refreshingTriggers

		logger.info(context, 'Refreshing triggers', {
			triggers: triggers.length
		})

		worker.setTriggers(context, triggers.map((trigger) => {
			const object = {
				id: trigger.id,
				slug: trigger.slug,
				action: trigger.data.action,
				target: trigger.data.target,
				arguments: trigger.data.arguments
			}

			if (trigger.data.filter) {
				object.filter = trigger.data.filter
			}

			if (trigger.data.interval) {
				object.interval = trigger.data.interval
			}

			if (trigger.data.mode) {
				object.mode = trigger.data.mode
			}

			return object
		}))
	}

	const triggerStream = await jellyfish.stream(
		context, session, SCHEMA_ACTIVE_TRIGGERS)

	const closeWorker = async () => {
		run = false
		await consumer.cancel()
		triggerStream.removeAllListeners()
		await triggerStream.close()
		await refreshingTriggers
		await jellyfish.disconnect(context)
		if (cache) {
			await cache.disconnect()
		}
	}

	const errorFunction = _.partial(options.onError, context)
	const errorHandler = (error) => {
		closeWorker().then(() => {
			errorFunction(error)
		}).catch(errorFunction)
	}

	triggerStream.once('error', errorHandler)
	triggerStream.on('data', () => {
		refreshTriggers().catch(errorHandler)
	})

	await refreshTriggers()

	// FIXME we should really have 2 workers, the consuming worker and the tick worker
	if (options.onLoop) {
		await producer.initialize(context)

		const loop = async () => {
			if (run) {
				await options.onLoop(context, worker, session)
			}

			if (!run) {
				return Bluebird.resolve()
			}

			await Bluebird.delay(options.delay)
			return loop()
		}

		loop().catch(errorHandler)
	} else {
		await consumer.initializeWithEventHandler(context, async (actionRequest) => {
			await options.onActionRequest(
				context, jellyfish, worker, consumer, session, actionRequest, errorHandler)
		})
	}

	return {
		jellyfish,
		worker,
		consumer,
		producer,
		stop: closeWorker
	}
}

exports.worker = async (context, options) => {
	return bootstrap(context, actionLibrary, {
		enablePriorityBuffer: true,
		onError: options.onError,
		onActionRequest: async (serverContext, jellyfish, worker, queue, session, actionRequest, errorHandler) => {
			return getActorKey(serverContext, jellyfish, session, actionRequest.data.actor)
				.then((key) => {
					actionRequest.data.context.worker = serverContext.id
					return worker.execute(key.id, actionRequest)
				})
				.catch(errorHandler)
		}
	})
}

exports.tick = async (context, options) => {
	return bootstrap(context, actionLibrary, {
		enablePriorityBuffer: false,
		delay: 2000,
		onError: options.onError,
		onLoop: async (serverContext, worker, session) => {
			const id = await uuid.random()
			return worker.tick({
				id: `TICK-REQUEST-${id}`,
				worker: serverContext.id
			}, session, {
				currentDate: new Date()
			})
		}
	})
}
