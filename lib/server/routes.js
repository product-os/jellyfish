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
const randomstring = require('randomstring')
const fs = require('fs')
const _ = require('lodash')
const multer = require('multer')
const path = require('path')
const uuid = require('uuid/v4')
const {
	version
} = require('../../package')
const Storage = require('./file-storage')

const fileStore = new Storage({
	driver: process.env.FS_DRIVER || 'localFS'
})
const upload = multer({
	storage: multer.memoryStorage()
})
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

		const {
			query,
			options
		} = request.body

		const handler = loadSchema(jellyfish, query, request.sessionToken)
			.then((schema) => {
				return jellyfish.query(request.sessionToken, schema, options)
			})

		return respond(handler, response)
	})

	// Some services, such as Workable, require the user to register
	// different endpoints for every type of event we're interested in,
	// which means we can't send more than one event type to
	// /api/v2/hooks/workable. As a solution, we can allow this rule to
	// have an optional "type" parameter that is not used for anything
	// apart from differentiating the endpoints.
	app.all('/api/v2/hooks/:provider/:type*?', (request, response) => {
		if (_.isEmpty(request.body)) {
			return error400('Invalid external event', response)
		}

		const EXTERNAL_EVENT_TYPE = 'external-event'
		const suffix = randomstring.generate().toLowerCase()

		return jellyfish.getCardBySlug(jellyfish.sessions.admin, EXTERNAL_EVENT_TYPE, {
			type: 'type'
		}).then((typeCard) => {
			if (!typeCard) {
				throw new Error(`No type card: ${EXTERNAL_EVENT_TYPE}`)
			}

			return worker.enqueue(jellyfish.sessions.admin, {
				action: 'action-create-card',
				card: typeCard.id,
				arguments: {
					properties: {
						slug: `${EXTERNAL_EVENT_TYPE}-${suffix}`,
						version: '1.0.0',
						data: {
							source: request.params.provider,
							headers: request.headers,
							payload: request.body
						}
					}
				}
			})
		}).then((id) => {
			return response.status(200).json({
				error: false,
				data: {
					id
				}
			})
		}).catch((error) => {
			return response.status(500).json({
				error: true,
				data: {
					type: 'Error',
					message: error.message
				}
			})
		})
	})

	app.get('/api/v2/file/:cardId/:fileName', authorize, (request, response) => {
		const {
			cardId,
			fileName
		} = request.params

		const card = jellyfish.getCardById(request.sessionToken, cardId)

		if (!card) {
			response.send(404)
		}

		fileStore.retrieve(cardId, fileName).then((file) => {
			return response.status(200).send(file)
		}).catch((error) => {
			return response.status(500).json({
				error: true,
				data: {
					type: 'Error',
					message: error.message
				}
			})
		})
	})

	app.post('/api/v2/action', authorize, upload.any(), async (request, response) => {
		// If files are uploaded, the action payload is serialized as the form field
		// "action" and will need to be parsed
		const action = request.files ? JSON.parse(request.body.action) : request.body

		if (_.isEmpty(action)) {
			return error400('No action request', response)
		}

		const files = []

		if (request.files) {
			// Upload magic
			request.files.forEach((file) => {
				const name = `${uuid()}.${file.originalname}`
				_.set(action.arguments.properties, file.fieldname, name)
				files.push({
					buffer: file.buffer,
					name
				})
			})
		}

		return worker.enqueue(request.sessionToken, action).then((id) => {
			return worker.waitResults(request.sessionToken, id)
		}).then(async (results) => {
			if (!results.error && request.files) {
				const cardId = results.data.id

				for (const item of files) {
					await fileStore.store(cardId, item.name, item.buffer)
				}
			}
			return results
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
					socket.emit('ready', {
						id
					})

					const closeStream = () => {
						stream.close()
						app.removeListener('close', closeStream)
					}

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
							closeStream()
						}
					})

					socket.on('disconnect', () => {
						closeStream()
					})

					app.once('close', () => {
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
