/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const core = require('@balena/jellyfish-core')
const Producer = require('@balena/jellyfish-queue').Producer
const Consumer = require('@balena/jellyfish-queue').Consumer
const Worker = require('@balena/jellyfish-worker').Worker
const Sync = require('@balena/jellyfish-sync').Sync
const actionLibrary = require('@balena/jellyfish-action-library')
const environment = require('@balena/jellyfish-environment')
const assert = require('@balena/jellyfish-assert')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const metrics = require('@balena/jellyfish-metrics')
const _ = require('lodash')

const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')
const graphql = require('./graphql')

module.exports = async (context, options) => {
	logger.info(context, 'Injecting integrations into Sync')

	const integrations = _.reduce(options.plugins, (carry, plugin) => {
		if (plugin.getSyncIntegrations) {
			const pluginIntegrations = plugin.getSyncIntegrations()
			_.each(pluginIntegrations, (integration, slug) => {
				if (carry[slug]) {
					throw new Error(
						`Integration '${slug}' already exists and cannot be loaded from plugin ${plugin.name}`)
				}

				carry[slug] = integration
			})
		}
		return carry
	}, {})

	context.sync = new Sync({
		integrations
	})

	logger.info(context, 'Configuring HTTP server')

	const webServer = await http(context, {
		port: environment.http.port,
		mountGraphqlServer: graphql(core.cards)
	})

	logger.info(context, 'Starting web server')

	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start()

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

	metrics.startServer(context, environment.metrics.ports.app)

	logger.info(context, 'Creating producer instance')
	const producer = new Producer(jellyfish, jellyfish.sessions.admin)
	logger.info(context, 'Initializing producer instance')
	await producer.initialize(context)

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	logger.info(context, 'Creating built-in worker')

	// FIXME this abomination is due to calling worker.execute right after producer.storeRequest
	// Fix that, and this one will disappear (but it will leave the scars)
	const uninitializedConsumer = new Consumer(jellyfish, jellyfish.sessions.admin)

	logger.info(context, 'Loading plugin sync integrations')

	const worker = new Worker(
		jellyfish, jellyfish.sessions.admin, actionLibrary, uninitializedConsumer)
	logger.info(context, 'Initializing built-in worker')
	await worker.initialize(context)

	logger.info(context, 'Inserting cards')

	const cards = _.reduce(options.plugins, (carry, plugin) => {
		if (plugin.getCards) {
			const pluginCards = plugin.getCards(core.cardMixins)
			_.each(pluginCards, (card, slug) => {
				if (carry[slug]) {
					throw new Error(`Card with slug ${slug} already exists and cannot be loaded from plugin ${plugin.name}`)
				}

				carry[slug] = card
			})
		}
		return carry
	}, {})

	const results = await cardLoader(
		context, jellyfish, worker, jellyfish.sessions.admin, cards)

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

	// Finish setting up routes and middlewares now that we are ready to serve
	// http traffic
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
