/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const core = require('@balena/jellyfish-core')
const Producer = require('@balena/jellyfish-queue').Producer
const Consumer = require('@balena/jellyfish-queue').Consumer
const Worker = require('@balena/jellyfish-worker').Worker
const actionLibrary = require('@balena/jellyfish-action-library')
const environment = require('@balena/jellyfish-environment')
const assert = require('@balena/jellyfish-assert')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const metrics = require('@balena/jellyfish-metrics')

const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')
const graphql = require('./graphql')
const loadDefaultCards = require('./default-cards')
const packageJSON = require('../../../package.json')
const utils = require('./utils')

/**
 * @summary Set up and return producer, consumer, and worker instances
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - backend instance
 * @param {Boolean} initializeProducer - flag denoting if producer instance should be initialized
 * @returns {Object} instances of producer, consumer, and worker
 *
 * @example
 * const {
 *   producer,
 *   consumer,
 *   worker
 * } = await setupWorker(context, jellyfish, true)
 */
const setupWorker = async (context, jellyfish, initializeProducer) => {
	logger.info(context, 'Creating producer instance')
	const producer = new Producer(jellyfish, jellyfish.sessions.admin)
	if (initializeProducer) {
		logger.info(context, 'Initializing producer instance')
		await producer.initialize(context)
	}
	logger.info(context, 'Creating consumer instance')
	const consumer = new Consumer(jellyfish, jellyfish.sessions.admin)
	logger.info(context, 'Creating worker instance')
	const worker = new Worker(jellyfish, jellyfish.sessions.admin, actionLibrary, consumer)
	logger.info(context, 'Initializing worker instance')
	await worker.initialize(context)
	return {
		producer,
		consumer,
		worker
	}
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

const SCHEMA_ACTIVE_SUBSCRIPTIONS = {
	type: 'object',
	properties: {
		active: {
			const: true
		},
		type: {
			const: 'subscription@1.0.0'
		}
	},
	required: [ 'id', 'slug', 'active', 'type', 'data' ],
	$$links: {
		'is attached to': {
			type: 'object',
			properties: {
				type: {
					const: 'view@1.0.0'
				},
				active: {
					const: true
				}
			},
			required: [ 'type', 'active' ]
		},
		'has attached element': {
			type: 'object',
			properties: {
				type: {
					const: 'create@1.0.0'
				},
				data: {
					type: 'object',
					properties: {
						actor: {
							type: 'string'
						}
					},
					required: [ 'actor' ]
				}
			},
			required: [ 'type', 'data' ]
		}
	}
}

/**
 * @summary Get actor key for worker instance
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - backend instance
 * @param {String} session - session id
 * @param {String} actorId - actor ID
 * @returns {Object} replaced card
 */
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

/**
 * @summary Transform a trigger card
 * @function
 *
 * @param {Object} trigger - trigger card
 * @returns {Object} transformed trigger card
 */
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
	if (_.has(trigger.data, [ 'schedule' ])) {
		object.schedule = trigger.data.schedule
	} else {
		object.schedule = 'async'
	}

	return object
}

/**
 * @summary Bootstrap for worker and tick instances
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} options - optional parameters
 * @returns {Object} backend, worker, consumer, and producer instances and a function to close created worker
 */
const workerBootstrap = async (context, options = {}) => {
	// Set up backend and worker
	const cache = (options.cache) ? options.cache : await utils.setupCache(context)
	const jellyfish = (options.jellyfish) ? options.jellyfish : await utils.setupCore(context, cache, options)
	const {
		producer,
		consumer,
		worker
	} = await setupWorker(context, jellyfish, false)

	const session = jellyfish.sessions.admin
	let run = true

	const triggerStream = await jellyfish.stream(
		context, session, SCHEMA_ACTIVE_TRIGGERS)
	const subscriptionStream = await jellyfish.stream(
		context, session, SCHEMA_ACTIVE_SUBSCRIPTIONS)

	const closeWorker = async () => {
		run = false
		await consumer.cancel()
		triggerStream.removeAllListeners()
		await triggerStream.close()
		subscriptionStream.removeAllListeners()
		await subscriptionStream.close()
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

	// --------> TRIGGERS
	triggerStream.once('error', errorHandler)

	// On a stream event, update the stored triggers in the worker
	triggerStream.on('data', (data) => {
		if (data.type === 'update' || data.type === 'insert') {
			// If `after` is null, the card is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (data.after === null) {
				worker.removeTrigger(context, data.id)
			} else {
				worker.upsertTrigger(context, transformTriggerCard(data.after))
			}
		}

		if (data.type === 'delete') {
			worker.removeTrigger(context, data.id)
		}
	})

	const triggers = await jellyfish.query(context, session, SCHEMA_ACTIVE_TRIGGERS)

	logger.info(context, 'Loading triggers', {
		triggers: triggers.length
	})

	worker.setTriggers(context, triggers.map(transformTriggerCard))

	// --------> SUBSCRIPTIONS
	subscriptionStream.once('error', errorHandler)

	// On a stream event, update the stored subscriptions in the worker
	subscriptionStream.on('data', (data) => {
		if (data.type === 'update' || data.type === 'insert' || data.type === 'unmatch') {
			// If `after` is null, the card is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (data.after === null) {
				worker.removeSubscription(context, data.id)
			} else {
				worker.upsertSubscription(context, data.after)
			}
		}

		if (data.type === 'delete') {
			worker.removeSubscription(context, data.id)
		}
	})

	const subscriptions = await jellyfish.query(context, session, SCHEMA_ACTIVE_SUBSCRIPTIONS)

	logger.info(context, 'Loading subscriptions', {
		subscriptions: subscriptions.length
	})

	worker.setSubscriptions(context, subscriptions)

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

/**
 * @summary Entrypoint for creating a worker instance
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} options - optional parameters
 * @returns {Object} backend, worker, consumer, and producer instances and a function to close created worker
 */
exports.worker = async (context, options = {}) => {
	metrics.markQueueConcurrency()
	return workerBootstrap(context, {
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
		database: options.database,
		jellyfish: options.jellyfish,
		cache: options.cache
	})
}

/**
 * @summary Entrypoint for creating a tick instance
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} options - optional parameters
 * @returns {Object} backend, worker, consumer, and producer instances and a function to close created worker
 */
exports.tick = async (context, options = {}) => {
	return workerBootstrap(context, {
		enablePriorityBuffer: false,
		delay: 2000,
		onError: options.onError,
		onLoop: async (serverContext, worker, session) => {
			const id = await uuid.random()
			return worker.tick({
				id: `TICK-REQUEST-${packageJSON.version}-${id}`,
				worker: serverContext.id
			}, session, {
				currentDate: new Date()
			})
		},
		jellyfish: options.jellyfish,
		cache: options.cache
	})
}

/**
 * @summary Entrypoint for creating an API instance
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} options - optional parameters
 * @returns {Object} worker, backend, producer instances, guest session id, server port, and a function to close server
 */
exports.api = async (context, options = {}) => {
	context.defaultCards = loadDefaultCards(core.cardMixins)

	logger.info(context, 'Configuring HTTP server')
	const webServer = await http(context, {
		port: environment.http.port,
		mountGraphqlServer: graphql(core.cards)
	})

	logger.info(context, 'Starting web server')

	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start()

	// Set up backend and worker
	const cache = (options.cache) ? options.cache : await utils.setupCache(context)
	const jellyfish = (options.jellyfish) ? options.jellyfish : await utils.setupCore(context, cache, options)
	const {
		producer,
		worker
	} = await setupWorker(context, jellyfish, true)

	logger.info(context, 'Inserting default cards')
	const results = await cardLoader(
		context, jellyfish, worker, jellyfish.sessions.admin)

	logger.info(context, 'Inserting test user', {
		username: environment.test.user.username,
		role: environment.test.user.role
	})

	assert.INTERNAL(context, environment.test.user.username,
		jellyfish.errors.JellyfishInvalidEnvironmentVariable,
		`No test username: ${environment.test.user.username}`)

	assert.INTERNAL(context, environment.test.user.role,
		jellyfish.errors.JellyfishInvalidEnvironmentVariable,
		`No test role: ${environment.test.user.role}`)

	const userCard = await jellyfish.replaceCard(
		context, jellyfish.sessions.admin, {
			slug: `user-${environment.test.user.username}`,
			type: 'user@1.0.0',
			version: '1.0.0',
			requires: [],
			capabilities: [],
			name: 'Test User',
			markers: [],
			tags: [],
			links: {},
			active: true,
			data: {
				email: 'test@jel.ly.fish',
				hash: 'PASSWORDLESS',
				roles: [ environment.test.user.role ]
			}
		})

	// Need test user during development and CI.
	if (!environment.isProduction() || environment.isCI()) {
		logger.info(context, 'Setting test user password', {
			username: environment.test.user.username,
			role: environment.test.user.role
		})

		assert.INTERNAL(context, userCard,
			jellyfish.errors.JellyfishNoElement,
			`Test user does not exist: ${environment.test.user.username}`)

		const requestOptions = await worker.pre(jellyfish.sessions.admin, {
			action: 'action-set-password@1.0.0',
			context,
			card: userCard.id,
			type: userCard.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password
			}
		})

		const request = await producer.storeRequest(
			worker.getId(), jellyfish.sessions.admin, requestOptions)
		const result = await worker.execute(jellyfish.sessions.admin, request)
		assert.INTERNAL(context, !result.error,
			worker.errors.WorkerAuthenticationError,
			`Could not set test password for ${environment.test.user.username}`)

		const orgCard = await jellyfish.getCardBySlug(
			context, jellyfish.sessions.admin,
			`org-${environment.test.user.organization}@latest`)

		assert.INTERNAL(context, orgCard,
			jellyfish.errors.JellyfishNoElement,
			`Test org does not exist: ${environment.test.user.organization}`)

		await jellyfish.replaceCard(
			context, jellyfish.sessions.admin, {
				type: 'link@1.0.0',
				name: 'has member',
				slug: `link-${orgCard.id}-has-member-${userCard.id}`,
				data: {
					inverseName: 'is member of',
					from: {
						id: orgCard.id,
						type: orgCard.type
					},
					to: {
						id: userCard.id,
						type: userCard.type
					}
				}
			})
	}

	logger.info(context, 'Configuring socket server')
	const socketServer = socket(jellyfish, webServer.server)

	// Finish setting up routes and middlewares now that we are ready to serve http traffic
	await webServer.ready(jellyfish, worker, producer, {
		guestSession: results.guestSession.id
	})

	return {
		worker,
		jellyfish,
		producer,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			await socketServer.close()
			await webServer.stop()
			await jellyfish.disconnect(context)
			if (cache) {
				await cache.disconnect()
			}
		}
	}
}
