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

const core = require('../core')
const Queue = require('../queue')
const Worker = require('../worker')
const actionLibrary = require('../action-library')

const actionServer = require('./action-server')
const configuration = require('./configuration')
const cardLoader = require('./card-loader')
const http = require('./http')
const socket = require('./socket')

module.exports = async (context) => {
	const jellyfish = await core.create(context, {
		backend: {
			host: configuration.database.host,
			port: configuration.database.port,
			user: configuration.database.user,
			password: configuration.database.password,
			certificate: configuration.database.certificate,
			database: configuration.database.name,
			buffer: configuration.database.pool.minimumSize,
			max: configuration.database.pool.maximumSize
		}
	})

	const queue = new Queue(context, jellyfish, jellyfish.sessions.admin)
	await queue.initialize(context)

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	const worker = new Worker(
		jellyfish, jellyfish.sessions.admin, actionLibrary, queue)
	await worker.initialize(context)

	const results = await cardLoader(
		context, jellyfish, worker, jellyfish.sessions.admin)

	// TODO: Split up the main workers as separate containers
	const workerManager = await actionServer.start(
		queue, context, jellyfish, jellyfish.sessions.admin)

	const webServer = await http(jellyfish, worker, queue, configuration, {
		guestSession: results.guestSession.id
	})
	const socketServer = socket(jellyfish, webServer.server)
	await webServer.start()

	return {
		jellyfish,
		queue,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			await socketServer.close()
			await webServer.stop()
			await workerManager.stop(context)
			await jellyfish.disconnect(context)
		}
	}
}
