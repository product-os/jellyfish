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

const _ = require('lodash')
const core = require('../core')
const Queue = require('../queue')

const actionServer = require('./action-server')
const errorReporter = require('./error-reporter')
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

	const workerManager = await actionServer.start(
		queue,
		context,
		jellyfish,
		jellyfish.sessions.admin,
		_.noop,
		(error) => {
			console.log('Caught error in action server')
			console.error(error)
			errorReporter.reportException(context, error)

			// TODO: We should remove this.
			// This is band-aid to make the server crash if the worker
			// crashes, so that the service gets restarted.
			// The proper solution is to decouple the worker from the
			// main server.
			setTimeout(() => {
				process.exit(1)
			}, 1000)
		}
	)

	const results = await cardLoader(
		context, jellyfish, queue, jellyfish.sessions.admin)

	await actionServer.flush(
		context, jellyfish, jellyfish.sessions.admin, workerManager, queue)

	const webServer = await http(jellyfish, queue, configuration, {
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
