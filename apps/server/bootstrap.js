/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const core = require('../../lib/core')
const Producer = require('../../lib/queue').Producer
const Consumer = require('../../lib/queue').Consumer
const Worker = require('../../lib/worker')
const actionLibrary = require('../../lib/action-library')
const environment = require('../../lib/environment')
const assert = require('../../lib/assert')
const logger = require('../../lib/logger').getLogger(__filename)
const metrics = require('../../lib/metrics')

const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')
const graphql = require('./graphql')

module.exports = async (context) => {
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
	const jellyfish = await core.create(context, cache, {
		backend: environment.database.options
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

	const worker = new Worker(
		jellyfish, jellyfish.sessions.admin, actionLibrary, uninitializedConsumer)
	logger.info(context, 'Initializing built-in worker')
	await worker.initialize(context)

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

	if (!environment.isProduction()) {
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
