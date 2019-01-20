/*
 * Copyright 2019 resin.io
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
const express = require('express')
const http = require('http')
const middlewares = require('./middlewares')
const routes = require('./routes')

module.exports = (jellyfish, queue, configuration) => {
	const application = express()
	const server = http.Server(application)
	application.set('port', configuration.http.port)

	middlewares(application, jellyfish)
	routes(application, jellyfish, queue)

	return {
		server,
		port: configuration.http.port,
		start: () => {
			return new Promise((resolve, reject) => {
				server.once('error', reject)

				// The .listen callback will be called regardless of if there is an
				// EADDRINUSE error, which means that the promise will resolve with
				// the incorrect port if the port is already in use. To get around
				// this, we add a listener for the `listening` event, which can be
				// removed if the port bind fails
				server.once('listening', () => {
					return resolve()
				})

				server.listen(application.get('port'))
			})
		},
		stop: async () => {
			await new Bluebird((resolve) => {
				server.close()
				server.once('close', resolve)
			})
		}
	}
}
