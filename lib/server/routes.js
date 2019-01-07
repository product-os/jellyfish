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
const sync = require('../sync')
const queue = require('../queue')
const logger = require('../logger').getLogger(__filename)
const syncContext = require('../action-library/sync-context')
const fs = require('fs')
const _ = require('lodash')
const multer = require('multer')
const path = require('path')
const uuid = require('uuid/v4')
const {
	version,
	codename
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
const loadSchema = (jellyfish, input, token, ctx) => {
	return Bluebird.try(() => {
		if (_.isString(input)) {
			// Try and load the view by id first
			return jellyfish.getCardById(ctx, token, input, {
				type: 'view'
			})
				.then((viewCardFromId) => {
					if (!viewCardFromId || viewCardFromId.type !== 'view') {
						// Now try and load the view by slug
						return jellyfish.getCardBySlug(ctx, token, input, {
							type: 'view'
						})
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

	// A middleware that creates a new request context and attaches it to the request
	const createContext = async (request, response, next) => {
		const ctx = logger.context.newPrefixContext('REQUEST')
		const start = Date.now()

		logger.info(ctx, 'HTTP request start', {
			uri: request.originalUrl
		})

		request.ctx = ctx
		response.on('end', () => {
			const end = Date.now()
			logger.info(ctx, 'HTTP request end', {
				time: end - start
			})
		})
		return next()
	}

	app.use(createContext)

	app.get('/', (request, response) => {
		response.sendFile(path.join('dist', 'index.html'))
	})

	app.get('/api/v2/config', (request, response) => {
		response.send({
			changelog,
			codename,
			version
		})
	})

	/*
	 * Queries the database for cards and returns them as an array.
	 * Accepts either a serialized JSON schema as qs params, or a view id or view card as the `query` parameter.
	 */
	app.post('/api/v2/query', authorize, (request, response) => {
		const ctx = request.ctx

		if (_.isEmpty(request.body)) {
			return error400('No query schema', response)
		}

		const {
			query,
			options
		} = request.body
		options.ctx = ctx

		const handler = loadSchema(jellyfish, query, request.sessionToken, ctx)
			.then((schema) => {
				return jellyfish.query(ctx, request.sessionToken, schema, options)
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
		const hostname = request.headers.host
		logger.info(request.ctx, 'Received webhook', {
			source: request.params.provider
		})

		const integrationToken = syncContext.getToken(request.params.provider)

		if (!sync.isValidExternalEventRequest(
			integrationToken, request.params.provider, request.rawBody, request.headers)) {
			logger.warn(request.ctx, 'Webhook rejected', {
				source: request.params.provider,
				hostname,
				body: request.body
			})

			return response.status(401).json({
				error: true,
				data: 'Webhook rejected'
			})
		}

		if (_.isEmpty(request.body)) {
			return error400('Invalid external event', response)
		}
		const ctx = request.ctx

		const EXTERNAL_EVENT_TYPE = 'external-event'
		const suffix = randomstring.generate().toLowerCase()

		return jellyfish.getCardBySlug(ctx, jellyfish.sessions.admin, EXTERNAL_EVENT_TYPE, {
			type: 'type'
		}).then((typeCard) => {
			if (!typeCard) {
				throw new Error(`No type card: ${EXTERNAL_EVENT_TYPE}`)
			}

			return worker.enqueue(jellyfish.sessions.admin, {
				action: 'action-create-card',
				card: typeCard.id,
				type: typeCard.type,
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
				},
				ctx
			})
		}).then((requestObject) => {
			return response.status(200).json({
				error: false,
				data: requestObject
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

		const card = jellyfish.getCardById(request.ctx, request.sessionToken, cardId)

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
		const ctx = request.ctx

		// If files are uploaded, the action payload is serialized as the form field
		// "action" and will need to be parsed
		const action = request.files ? JSON.parse(request.body.action) : request.body

		logger.info(ctx, 'HTTP action request', {
			action
		})

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

		action.ctx = ctx
		return worker.enqueue(request.sessionToken, action).then((id) => {
			return queue.waitResults(jellyfish, request.sessionToken, id)
		}).then(async (results) => {
			logger.info(ctx, 'Got action results', results)
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
			logger.error(ctx, 'HTTP unexpected error', {
				error: {
					message: error.message,
					name: error.name,
					stack: error.stack
				}
			})

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

	/*
	* Health-Check endpoint
	*/
	app.get('/ping', (request, response) => {
		// TODO: Add more checks, inc db, etc.
		// Return 50X in case of any error
		response.send({
			status: 'OK'
		})
	})

	const openStreams = {}

	app.once('close', () => {
		_.forEach(openStreams, (stream) => {
			stream.close()
		})
	})

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50)
		const ctx = logger.context.newPrefixContext('REQUEST')

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

			return jellyfish.stream(ctx, token, schema)
				.then((stream) => {
					socket.emit('ready', {
						id
					})

					openStreams[id] = stream

					const closeStream = () => {
						stream.close()
						Reflect.deleteProperty(openStreams, id)
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
