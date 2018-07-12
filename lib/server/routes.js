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
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const {
	version
} = require('../../package')

const rawChangelog = fs.readFileSync('./CHANGELOG.md', 'utf8')

// Responds with a 400 error and a message
const error400 = (message, response) => {
	return response.status(400).json({
		error: true,
		data: message
	})
}

// Generic wrapper for responding with data from endpoint handlers
const respond = (handlerPromise, response) => {
	return handlerPromise
		.then((data) => {
			response.status(200).json({
				error: false,
				data
			})
		}).catch((error) => {
			response.status(500).json({
				error: true,
				data: error.message
			})
		})
}

// Gets a query schema from a schema, view card or view id
const loadSchema = (jellyfish, input, token) => {
	return Bluebird.try(() => {
		if (_.isString(input)) {
			// Try and load the view by id first
			return jellyfish.getCardById(token, input, {
				type: 'view'
			})
				.then((viewCardFromId) => {
					if (!viewCardFromId || viewCardFromId.type !== 'view') {
						// Now try and load the view by slug
						return jellyfish.getCardBySlug(token, input)
							.then((viewCardFromSlug) => {
								if (!viewCardFromSlug || viewCardFromSlug.type !== 'view') {
									throw new jellyfish.errors.JellyfishNoView(`Unknown view: ${input}`)
								}
								return viewCardFromSlug
							})
					}
					return viewCardFromId
				})
		}

		return input
	})
}

// Strip the semantic version header from the changelog
const changelog = rawChangelog.slice(rawChangelog.indexOf('##'))

exports.bindRoutes = (jellyfish, worker, app, socketServer) => {
	// A middleware that retrieves a Bearer token and attach it to the request object
	// as `sessionToken`
	const authorize = (request, response, next) => {
		const authorization = request.headers.authorization

		const token = _.last(_.split(authorization, ' '))

		request.sessionToken = token || jellyfish.sessions.guest

		return next()
	}

	app.get('/', (request, response) => {
		response.sendFile(path.join('dist', 'index.html'))
	})

	app.get('/api/v2/config', (request, response) => {
		response.send({
			version,
			changelog
		})
	})

	/*
	 * Queries the database for cards and returns them as an array.
	 * Accepts either a serialized JSON schema as qs params, or a view id or view card as the `query` parameter.
	 */
	app.post('/api/v2/query', authorize, (request, response) => {
		if (_.isEmpty(request.body)) {
			return error400('No query schema', response)
		}

		const query = request.body.query || request.body

		const handler = loadSchema(jellyfish, query, request.sessionToken)
			.then((schema) => {
				return jellyfish.query(request.sessionToken, schema)
			})

		return respond(handler, response)
	})

	app.post('/api/v2/action', authorize, (request, response) => {
		if (_.isEmpty(request.body)) {
			return error400('No action request', response)
		}

		return worker.enqueue(request.sessionToken, request.body).then((id) => {
			return worker.waitResults(request.sessionToken, id)
		}).then((results) => {
			const code = results.error ? 500 : 200
			return response.status(code).json(results)
		}).catch((error) => {
			const currentDate = new Date()
			return response.status(500).json({
				error: true,
				timestamp: currentDate.toISOString(),
				data: {
					type: 'Error',
					message: error.message
				}
			})
		})
	})

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50)

		// The query property can be either a JSON schema, view ID or a view card
		socket.on('query', ({
			token,
			id,
			data: {
				query
			}
		}) => {
			if (!token) {
				return socket.emit({
					error: true,
					data: 'No session token',
					id
				})
			}
			const schema = query

			return jellyfish.stream(token, schema)
				.then((stream) => {
					stream.on('data', (results) => {
						// The event name is changed to `update` to indicate that this is
						// partial data and not the full result set
						socket.emit('update', {
							error: false,
							data: results,
							id
						})
					})

					socket.on('destroy', (streamId) => {
						if (id === streamId) {
							stream.close()
						}
					})

					socket.on('disconnect', () => {
						stream.close()
					})
				})
				.catch((error) => {
					socket.emit('streamError', {
						error: true,
						data: error.message,
						id
					})
				})
		})
	})
}
