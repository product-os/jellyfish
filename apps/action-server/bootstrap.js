/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const randomstring = require('randomstring')
const Bluebird = require('bluebird')
const _ = require('lodash')
const actionLibrary = require('../../lib/action-library')
const logger = require('../../lib/logger').getLogger(__filename)
const Worker = require('../../lib/worker')
const Queue = require('../../lib/queue')
const core = require('../../lib/core')
const environment = require('../../lib/environment')

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

const bootstrap = async (context, library, options) => {
	logger.info(context, 'Setting up cache')
	const cache = environment.cache.disable
		? null
		: new core.MemoryCache(environment.getRedisConfiguration())
	if (cache) {
		await cache.connect(context)
	}

	logger.info(context, 'Instantiating core library')
	const jellyfish = await core.create(context, cache, {
		backend: environment.database.options
	})

	const session = jellyfish.sessions.admin
	const queue = new Queue(context, jellyfish, session)
	await queue.initialize(context)

	queue.once('error', (error) => {
		logger.exception(context, 'Queue error', error)
		setTimeout(() => {
			process.exit(1)
		}, 5000)
	})

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	const worker = new Worker(
		jellyfish, session, library, queue)
	await worker.initialize(context)

	let run = true
	let refreshingTriggers = Bluebird.resolve()
	let currentIteration = Bluebird.resolve()

	const loop = async () => {
		if (run) {
			currentIteration = options.onLoop(
				context, jellyfish, worker, queue, session)
			await currentIteration
		}

		if (!run) {
			return Bluebird.resolve()
		}

		await Bluebird.delay(options.delay)
		return loop()
	}

	const refreshTriggers = async () => {
		refreshingTriggers = jellyfish.query(
			context, session, SCHEMA_ACTIVE_TRIGGERS)
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

	const triggerStream = await jellyfish.stream(
		context, session, SCHEMA_ACTIVE_TRIGGERS)

	const closeWorker = async () => {
		await currentIteration
		run = false
		triggerStream.removeAllListeners()
		await triggerStream.close()
		await currentIteration
		await refreshingTriggers
		await queue.destroy()
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

	loop().catch(errorHandler)

	return {
		jellyfish,
		worker,
		queue,
		stop: closeWorker
	}
}

exports.worker = async (context, options) => {
	return bootstrap(context, actionLibrary, {
		delay: 500,
		onError: options.onError,
		onLoop: async (serverContext, jellyfish, worker, queue, session) => {
			const actionRequest = await queue.dequeue(serverContext, worker.getId())
			if (!actionRequest) {
				return null
			}

			return getActorKey(
				serverContext, jellyfish, session, actionRequest.data.actor).then((key) => {
				return worker.execute(key.id, actionRequest)
			})
		}
	})
}

exports.tick = async (context, options) => {
	return bootstrap(context, actionLibrary, {
		delay: 2000,
		onError: options.onError,
		onLoop: async (serverContext, jellyfish, worker, queue, session) => {
			return worker.tick({
				id: `TICK-REQUEST-${randomstring.generate(20)}`
			}, session, {
				currentDate: new Date()
			})
		}
	})
}
