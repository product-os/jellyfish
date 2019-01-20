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

const Bluebird = require('bluebird')
const portfinder = require('portfinder')
const logger = require('../logger').getLogger(__filename)
const environment = require('../environment')
const express = require('express')
const http = require('http')

const middlewares = require('./http/middlewares')
const routes = require('./http/routes')
const socket = require('./socket')

exports.createWebServer = (context, jellyfish, queue, configuration) => {
	const application = express()
	const server = http.Server(application)
	const socketServer = socket(jellyfish, server)

	application.set('port', configuration.http.port)
	middlewares(application, jellyfish)
	routes(application, jellyfish, queue)

	// Resolve the promise once the server is ready to accept incoming
	// connections.
	return new Promise(async (resolve) => {
		// The .listen callback will be called regardless of if there is an
		// EADDRINUSE error, which means that the promise will resolve with
		// the incorrect port if the port is already in use. To get around
		// this, we add a listener for the `listening` event, which can be
		// removed if the port bind fails
		const listenCallback = () => {
			const port = server.address().port
			resolve(port)
		}

		const listenOnPort = (port) => {
			server.on('listening', listenCallback)
			server.listen(port)
		}

		server.on('error', async (error) => {
			// If the server is running in a test environment and the
			// port is in use, try binding to a higher port number.
			if (error.code === 'EADDRINUSE' && !environment.isProduction()) {
				// The original listener has to be removed, otherwise it will be
				// triggered when the server finds an available port
				logger.warn(context, 'Port already in use', {
					port: error.port
				})

				server.removeListener('listening', listenCallback)
				server.close()
				return listenOnPort(await portfinder.getPortPromise({
					port: error.port + 1
				}))
			}

			throw error
		})

		listenOnPort(await portfinder.getPortPromise({
			port: application.get('port')
		}))
	}).then((port) => {
		return {
			port,
			stop: async () => {
				await new Bluebird((resolve) => {
					socketServer.close()
					server.close()
					server.once('close', resolve)
				})
			}
		}
	})
}
