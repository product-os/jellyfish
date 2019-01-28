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

const errio = require('errio')
const randomstring = require('randomstring')
const core = require('../core')
const Queue = require('../queue')
const Worker = require('../worker')
const actionLibrary = require('../action-library')
const errorReporter = require('../error-reporter')
const environment = require('../environment')
const logger = require('../logger').getLogger(__filename)
const actionServer = require('../action-server')

const configuration = require('./configuration')
const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')

module.exports = async (context) => {
	logger.info(context, 'Setting up cache')
	const databaseConfiguration = environment.getDatabaseConfiguration()

	const cache = new core.MemoryCache({
		mock: true,
		database: databaseConfiguration.database
	})

	await cache.connect(context)

	logger.info(context, 'Instantiating core library')
	const jellyfish = await core.create(context, cache, {
		backend: databaseConfiguration
	})

	logger.info(context, 'Creating queue instance')
	const queue = new Queue(context, jellyfish, jellyfish.sessions.admin)
	logger.info(context, 'Initializing queue instance')
	await queue.initialize(context)

	queue.once('error', (error) => {
		logger.error(context, 'Queue error', {
			error: errio.toObject(error, {
				stack: true
			})
		})

		errorReporter.reportException(context, error)
		process.exit(1)
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
	const webServer = await http(jellyfish, worker, queue, configuration, {
		guestSession: results.guestSession.id
	})

	logger.info(context, 'Configuring socket server')
	const socketServer = socket(jellyfish, webServer.server)

	// TODO: Split up the main workers as separate containers
	logger.info(context, 'Starting action request servers')
	const actionRequestServer1 = await actionServer.startActionRequestServer({
		id: `ACTION-REQUEST-WORKER-${randomstring.generate(20)}`
	}, cache, {
		onError: (serverContext, error) => {
			logger.error(serverContext, 'Action server error', {
				error: errio.toObject(error, {
					stack: true
				})
			})

			errorReporter.reportException(serverContext, error)
			process.exit(1)
		}
	})
	const actionRequestServer2 = await actionServer.startActionRequestServer({
		id: `ACTION-REQUEST-WORKER-${randomstring.generate(20)}`
	}, cache, {
		onError: (serverContext, error) => {
			logger.error(serverContext, 'Action server error', {
				error: errio.toObject(error, {
					stack: true
				})
			})

			errorReporter.reportException(serverContext, error)
			process.exit(1)
		}
	})

	logger.info(context, 'Starting tick server')
	const tickServer = await actionServer.startTickServer({
		id: `TICK-WORKER-${randomstring.generate(20)}`
	}, cache, {
		onError: (serverContext, error) => {
			logger.error(serverContext, 'Tick server error', {
				error: errio.toObject(error, {
					stack: true
				})
			})

			errorReporter.reportException(serverContext, error)
			process.exit(1)
		}
	})

	logger.info(context, 'Starting web server')
	await webServer.start()

	return {
		jellyfish,
		queue,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			await socketServer.close()
			await webServer.stop()
			await actionRequestServer1.stop()
			await actionRequestServer2.stop()
			await tickServer.stop()
			await queue.destroy()
			await jellyfish.disconnect(context)
			await cache.disconnect()
		}
	}
}
