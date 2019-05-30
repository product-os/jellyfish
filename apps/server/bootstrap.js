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
const logger = require('../../lib/logger').getLogger(__filename)

const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')

module.exports = async (context) => {
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
