/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const core = require('../../lib/core')
const Queue = require('../../lib/queue')
const Worker = require('../../lib/worker')
const actionLibrary = require('../../lib/action-library')
const environment = require('../../lib/environment')
const assert = require('../../lib/assert')
const logger = require('../../lib/logger').getLogger(__filename)

const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')

module.exports = async (context) => {
	logger.info(context, 'Setting up cache')
	const cache = environment.cache.disable
		? null
		: new core.MemoryCache(environment.redis)
	if (cache) {
		await cache.connect(context)
	}

	logger.info(context, 'Instantiating core library')
	const jellyfish = await core.create(context, cache, {
		backend: environment.database.options
	})

	logger.info(context, 'Creating queue instance')
	const queue = new Queue(
		context, jellyfish, jellyfish.sessions.admin)
	logger.info(context, 'Initializing queue instance')
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
	logger.info(context, 'Creating built-in worker')
	const worker = new Worker(
		jellyfish, jellyfish.sessions.admin, actionLibrary, queue)
	logger.info(context, 'Initializing built-in worker')
	await worker.initialize(context)

	logger.info(context, 'Inserting default cards')
	const results = await cardLoader(
		context, jellyfish, worker, jellyfish.sessions.admin)

	const userCard = await jellyfish.replaceCard(
		context, jellyfish.sessions.admin, {
			slug: `user-${environment.test.user.username}`,
			type: 'user',
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
			action: 'action-set-password',
			context,
			card: userCard.id,
			type: userCard.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password
			}
		})

		const request = await queue.enqueue(
			worker.getId(), jellyfish.sessions.admin, requestOptions)
		const result = await worker.execute(jellyfish.sessions.admin, request)
		assert.INTERNAL(context, !result.error,
			worker.errors.WorkerAuthenticationError,
			`Could not set test password for ${environment.test.user.username}`)

		const orgCard = await jellyfish.getCardBySlug(
			context, jellyfish.sessions.admin,
			`org-${environment.test.user.organization}`, {
				type: 'org'
			})

		assert.INTERNAL(context, orgCard,
			jellyfish.errors.JellyfishNoElement,
			`Test org does not exist: ${environment.test.user.organization}`)

		await jellyfish.replaceCard(
			context, jellyfish.sessions.admin, {
				type: 'link',
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

	logger.info(context, 'Configuring HTTP server')
	const webServer = await http(context, jellyfish, worker, queue, {
		port: environment.http.port
	}, {
		guestSession: results.guestSession.id
	})

	logger.info(context, 'Configuring socket server')
	const socketServer = socket(jellyfish, webServer.server)

	logger.info(context, 'Starting web server')
	await webServer.start()

	return {
		worker,
		jellyfish,
		queue,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			await socketServer.close()
			await webServer.stop()
			await queue.destroy()
			await jellyfish.disconnect(context)
			if (cache) {
				await cache.disconnect()
			}
		}
	}
}
