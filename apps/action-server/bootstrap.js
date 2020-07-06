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
const environment = require('@balena/jellyfish-environment')
const uuid = require('@balena/jellyfish-uuid')
const metrics = require('../../lib/metrics')

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

	return jellyfish.replaceCard(context, session, jellyfish.defaults({
		slug: keySlug,
		version: '1.0.0',
		type: 'session@1.0.0',
		data: {
			actor: actorId
		}
	}))
}

const transformTriggerCard = (trigger) => {
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

	// Triggered actions default to being asynchronous
	if (_.has(trigger.data, [ 'async' ])) {
		object.async = trigger.data.async
	} else {
		object.async = true
	}

	return object
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
	const backendOptions = (options && options.database) ? Object.assign({}, environment.database.options, options.database)
		: environment.database.options
	const jellyfish = await core.create(context, cache, {
		backend: backendOptions
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

	const triggerStream = await jellyfish.stream(
		context, session, SCHEMA_ACTIVE_TRIGGERS)

	const closeWorker = async () => {
		run = false
		await consumer.cancel()
		triggerStream.removeAllListeners()
		await triggerStream.close()
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

	// On a stream event, update the stored triggers in the worker
	triggerStream.on('data', (data) => {
		if (data.type === 'update' || data.type === 'insert') {
			// If `after` is null, the card is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (data.after === null) {
				worker.removeTrigger(context, data.before.slug)
			} else {
				worker.upsertTrigger(context, transformTriggerCard(data.after))
			}
		}

		if (data.type === 'delete') {
			worker.removeTrigger(context, data.before.slug)
		}
	})

	const triggers = await jellyfish.query(context, session, SCHEMA_ACTIVE_TRIGGERS)

	logger.info(context, 'Loading triggers', {
		triggers: triggers.length
	})

	worker.setTriggers(context, triggers.map(transformTriggerCard))

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
	metrics.startServer(context, options.metricsPort)
	metrics.markQueueConcurrency()
	return bootstrap(context, actionLibrary, {
		enablePriorityBuffer: true,
		onError: options.onError,
		onActionRequest: async (serverContext, jellyfish, worker, queue, session, actionRequest, errorHandler) => {
			metrics.markActionRequest(actionRequest.data.action.split('@')[0])
			return getActorKey(serverContext, jellyfish, session, actionRequest.data.actor)
				.then((key) => {
					actionRequest.data.context.worker = serverContext.id
					return worker.execute(key.id, actionRequest)
				})
				.catch(errorHandler)
		},
		database: options.database
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
