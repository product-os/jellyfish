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

const bodyParser = require('body-parser')
const compression = require('compression')
const debug = require('debug')('jellyfish:api')
const express = require('express')
const http = require('http')
const socketIo = require('socket.io')

// A regex that matches file types that should be compressed
const COMPRESSION_REGEX = /\.(mp3|js|map|svg)$/

exports.createWebServer = (config) => {
	const app = express()
	const server = http.Server(app)
	const socketServer = socketIo(server)

	app.set('port', config.port)

	// Enable compression only for static files and the homepage
	app.use(compression({
		filter: (req, res) => {
			if (req.url === '/' || req.url.match(COMPRESSION_REGEX)) {
				return compression.filter(req, res)
			}

			return false
		}
	}))

	app.use(bodyParser.json())
	app.use(express.static('dist'))

	app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*')
		res.header('Access-Control-Allow-Headers', [
			'Accept',
			'Authorization',
			'Content-Type',
			'Origin',
			'X-Requested-With'
		].join(', '))
		res.header('Access-Control-Allow-Methods', [
			'DELETE',
			'GET',
			'HEAD',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT'
		].join(', '))
		next()
	})

	// Resolve the promise once the server is ready to accept incoming
	// connections.
	return new Promise((resolve) => {
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
			server.listen(port)
				.on('listening', listenCallback)
		}

		server.on('error', (error) => {
			// If the server is running in a test environment and the
			// port is in use, try binding to a higher port number.
			if (error.code === 'EADDRINUSE' && process.env.NODE_ENV === 'test') {
				// The original listener has to be removed, otherwise it will be
				// triggered when the server finds an available port
				debug(`Port ${error.port} is already in use, attempting to bind to ${error.port + 1}`)
				server.removeListener('listening', listenCallback)
				server.close()
				return listenOnPort(error.port + 1)
			}

			throw error
		})

		listenOnPort(app.get('port'))
	}).then((port) => {
		return {
			port,
			app,
			server,
			socketServer
		}
	})
}
