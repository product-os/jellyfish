/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const errio = require('errio')
const multer = require('multer')
const Storage = require('./file-storage')
const oauth = require('./oauth')
const logger = require('../../../lib/logger').getLogger(__filename)
const environment = require('../../../lib/environment')
const sync = require('../../../lib/sync')
const uuid = require('../../../lib/uuid')
const packageJSON = require('../../../package.json')
const facades = require('./facades')

const fileStore = new Storage({
	driver: environment.fileStorage.driver
})
const upload = multer({
	storage: multer.memoryStorage()
})

const sendHTTPError = (request, response, error) => {
	// Add more debugging information in case we pass an invalid object
	// to `errio` (which doesn't handle other data very well).
	if (!_.isError(error)) {
		logger.error(request.context, 'Invalid error object', {
			ip: request.ip,
			error
		})

		return response.status(500).json({
			error: true,
			data: error
		})
	}

	const errorObject = errio.toObject(error, {
		stack: !error.expected
	})

	if (error.expected) {
		logger.info(request.context, 'HTTP expected error', {
			ip: request.ip,
			error: errorObject
		})

		return response.status(400).json({
			error: true,
			data: _.omit(errorObject, [ 'expected' ])
		})
	}

	logger.exception(request.context, 'HTTP unexpected error', error)
	return response.status(500).json({
		error: true,
		data: errorObject.message || error
	})
}

module.exports = (application, jellyfish, worker, queue) => {
	const queryFacade = new facades.QueryFacade(jellyfish)
	const authFacade = new facades.AuthFacade(jellyfish)

	application.get('/api/v2/config', (request, response) => {
		response.send({
			codename: packageJSON.codename,
			version: packageJSON.version
		})
	})

	/*
	 * This endpoint should very simple and should not
	 * communicate with the API by design.
	 * The idea is that this endpoint checks the container
	 * health and that only, as otherwise we are
	 * side-checking the database health, and get restarted
	 * even if the database and not the container is the
	 * problem.
	 */
	application.get('/health', (request, response) => {
		return response.status(200).end()
	})

	application.get('/status', (request, response) => {
		return Bluebird.props({
			kernel: jellyfish.getStatus()
		}).then((status) => {
			return response.status(200).json(status)
		}).catch((error) => {
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.exception(request.context, 'Status error', error)
			return response.status(500).json({
				error: true,
				data: errorObject
			})
		})
	})

	application.get('/ping', (request, response) => {
		const PING_TYPE = 'ping@1.0.0'
		const PING_SLUG = 'ping-api'

		const getTypeStartDate = new Date()
		return jellyfish.getCardBySlug(
			request.context, jellyfish.sessions.admin, PING_TYPE).then(async (typeCard) => {
			const getTypeEndDate = new Date()
			if (!typeCard) {
				throw new Error(`No type card: ${PING_TYPE}`)
			}

			logger.info(request.context, 'Got type card', {
				slug: typeCard.slug,
				time: getTypeEndDate.getTime() - getTypeStartDate.getTime()
			})

			const enqueueStartDate = new Date()
			const actionRequest = await queue.enqueue(worker.getId(), jellyfish.sessions.admin, {
				action: 'action-ping',
				card: typeCard.id,
				type: typeCard.type,
				context: request.context,
				arguments: {
					slug: PING_SLUG
				}
			})

			const enqueueEndDate = new Date()
			logger.info(request.context, 'Enqueue ping request', {
				slug: actionRequest.slug,
				time: enqueueEndDate.getTime() - enqueueStartDate.getTime()
			})

			const waitStartDate = new Date()
			const results = await queue.waitResults(
				request.context, actionRequest)

			const waitEndDate = new Date()
			logger.info(request.context, 'Waiting for ping results', {
				slug: actionRequest.slug,
				time: waitEndDate.getTime() - waitStartDate.getTime()
			})

			if (results.error) {
				return response.status(500).json(results)
			}

			return response.status(200).json({
				error: false,
				data: _.omit(results.data, [ 'links' ])
			})
		}).catch((error) => {
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.exception(request.context, 'Ping error', error)
			return response.status(500).json({
				error: true,
				data: errorObject
			})
		})
	})

	application.get('/api/v2/oauth/:provider/:slug', (request, response) => {
		const associateUrl = oauth.getAuthorizeUrl(
			request.params.provider, request.params.slug)
		const status = associateUrl ? 200 : 400
		return response.status(status).json({
			url: associateUrl
		})
	})

	const oauthAssociate = async (request, response, slug, code) => {
		if (!slug) {
			return response.sendStatus(401)
		}

		const user = await jellyfish.getCardBySlug(
			request.context, jellyfish.sessions.admin, `${slug}@latest`)

		if (!user) {
			return response.sendStatus(401)
		}

		let credentials = null

		try {
			credentials = await oauth.authorize(
				request.context,
				worker,
				queue,
				request.sessionToken,
				request.params.provider, {
					code,
					ip: request.ip,
					actor: user.id
				}
			)
		} catch (error) {
			if (error.name === 'OAuthUnsuccessfulResponse') {
				return response.status(401).json({
					error: true,
					data: _.pick(error, [ 'name', 'message' ])
				})
			}

			return sendHTTPError(request, response, error)
		}

		if (!credentials) {
			return response.sendStatus(401)
		}

		await oauth.associate(
			request.context,
			worker,
			queue,
			jellyfish.sessions.admin,
			request.params.provider,
			user,
			credentials, {
				code,
				ip: request.ip
			}
		)

		return response.status(200).json({
			error: false,
			slug: user.slug
		})
	}

	application.post('/api/v2/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request, response, request.body.slug, request.body.code)
	})

	application.get('/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request, response, request.query.state, request.query.code)
	})

	application.get('/api/v2/type/:type', (request, response) => {
		const [ base, version ] = request.params.type.split('@')
		jellyfish.query(request.context, request.sessionToken, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',

					// TODO: Get rid of this enum once we have
					// versions supported all across the system.
					enum: [ base, `${base}@${version || '1.0.0'}` ]
				}
			}
		}).then((results) => {
			return response.status(200).json(results)
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/id/:id', (request, response) => {
		jellyfish.getCardById(
			request.context, request.sessionToken, request.params.id).then((card) => {
			if (card) {
				return response.status(200).json(card)
			}

			return response.status(404).end()
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/slug/:slug', (request, response) => {
		jellyfish.getCardBySlug(
			request.context, request.sessionToken, `${request.params.slug}@latest`, {
				type: request.params.type
			}).then((card) => {
			if (card) {
				return response.status(200).json(card)
			}

			return response.status(404).end()
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	// Some services, such as Workable, require the user to register
	// different endpoints for every type of event we're interested in,
	// which means we can't send more than one event type to
	// /api/v2/hooks/workable. As a solution, we can allow this rule to
	// have an optional "type" parameter that is not used for anything
	// apart from differentiating the endpoints.
	application.all('/api/v2/hooks/:provider/:type*?', (request, response) => {
		const hostname = request.headers.host
		const startDate = new Date()
		logger.info(request.context, 'Received webhook', {
			ip: request.ip,
			source: request.params.provider
		})

		// A dummy /dev/null that we can use in various
		// services for testing purposes.
		if (request.params.provider === 'none') {
			return response.status(200).end()
		}

		const integrationToken =
			environment.integration[request.params.provider]

		return Bluebird.try(async () => {
			if (!await sync.isValidEvent(
				request.params.provider,
				integrationToken, {
					raw: request.rawBody || request.body,
					headers: request.headers
				})) {
				logger.warn(request.context, 'Webhook rejected', {
					ip: request.ip,
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
				return response.status(400).json({
					error: true,
					data: 'Invalid external event'
				})
			}

			const validateDate = new Date()
			logger.info(request.context, 'Webhook validated', {
				source: request.params.provider,
				ip: request.ip,
				time: validateDate.getTime() - startDate.getTime()
			})

			const EXTERNAL_EVENT_TYPE = 'external-event@1.0.0'
			return jellyfish.getCardBySlug(
				request.context, jellyfish.sessions.admin, EXTERNAL_EVENT_TYPE).then((typeCard) => {
				if (!typeCard) {
					throw new Error(`No type card: ${EXTERNAL_EVENT_TYPE}`)
				}

				return uuid.random().then((id) => {
					return queue.enqueue(worker.getId(), jellyfish.sessions.admin, {
						action: 'action-create-card',
						card: typeCard.id,
						type: typeCard.type,
						context: request.context,
						arguments: {
							reason: null,
							properties: {
								slug: `${EXTERNAL_EVENT_TYPE}-${id}`,
								version: '1.0.0',
								data: {
									source: request.params.provider,
									headers: request.headers,
									payload: request.body
								}
							}
						}
					})
				})
			}).then((actionRequest) => {
				const enqueuedDate = new Date()
				logger.info(request.context, 'Webhook enqueued', {
					source: request.params.provider,
					ip: request.ip,
					time: enqueuedDate.getTime() - startDate.getTime()
				})

				return response.status(200).json({
					error: false,
					data: actionRequest
				})
			})
		}).catch((error) => {
			error.body = request.body
			logger.exception(request.context, 'Webhook error', error)
			return response.status(500).json({
				error: true,
				data: {
					type: 'Error',
					message: error.message
				}
			})
		})
	})

	application.get('/api/v2/file/:cardId/:fileName', async (request, response) => {
		const card = await jellyfish.getCardById(
			request.context, request.sessionToken, request.params.cardId)
		if (!card) {
			return response.send(404)
		}

		const sessionCard = await jellyfish.getCardById(
			request.context, request.sessionToken, request.sessionToken)
		if (!sessionCard) {
			return response.send(401)
		}

		const attachment = _.find(_.get(card, [ 'data', 'payload', 'attachments' ]), (item) => {
			return item.url.includes(request.params.fileName)
		})

		if (attachment) {
			return sync.getFile(
				'front',
				environment.integration.front,
				request.params.fileName, {
					log: {
						warn: (message, data) => {
							// eslint-disable-next-line jellyfish/logger-string-expression
							logger.warn(request.context, message, data)
						},
						info: (message, data) => {
							// eslint-disable-next-line jellyfish/logger-string-expression
							logger.info(request.context, message, data)
						}
					}
				}, {
					actor: sessionCard.data.actor
				}).then((file) => {
				return response.status(200).send(file)
			}).catch((error) => {
				return sendHTTPError(request, response, error)
			})
		}

		return fileStore.retrieve(
			request.params.cardId, request.params.fileName).then((file) => {
			if (!file) {
				return response.status(404).end()
			}

			return response.status(200).send(file)
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.post('/api/v2/action', upload.any(), async (request, response) => {
		// If files are uploaded, the action payload is serialized as the form field
		// "action" and will need to be parsed
		const action = request.files
			? JSON.parse(request.body.action)
			: request.body

		logger.info(request.context, 'HTTP action request', {
			ip: request.ip,
			card: action.card,
			type: action.type,
			action: action.action
		})

		if (_.isEmpty(action)) {
			return response.status(400).json({
				error: true,
				data: 'No action request'
			})
		}

		if (!action.type) {
			return response.status(400).json({
				error: true,
				data: 'No action card type'
			})
		}

		if (!action.card) {
			return response.status(400).json({
				error: true,
				data: 'No input card'
			})
		}

		const files = []

		return uuid.random().then(async (id) => {
			if (request.files) {
				// Upload magic
				request.files.forEach((file) => {
					const name = `${id}.${file.originalname}`

					_.set(action.arguments.payload, file.fieldname, {
						name: file.originalname,
						slug: name,
						mime: file.mimetype,
						bytesize: file.buffer.byteLength
					})

					files.push({
						buffer: file.buffer,
						name
					})
				})
			}

			request.payload = action
			action.context = request.context

			const finalRequest = await worker.pre(request.sessionToken, action)
			return queue.enqueue(worker.getId(), request.sessionToken, finalRequest)
		}).then((actionRequest) => {
			return queue.waitResults(request.context, actionRequest)
		}).then(async (results) => {
			logger.info(request.context, 'Got action results', results)
			if (!results.error && request.files) {
				const cardId = results.data.id

				for (const item of files) {
					logger.info(request.context, 'Uploading attachment', {
						card: cardId,
						key: item.name
					})

					await fileStore.store(cardId, item.name, item.buffer)
				}
			}
			return results
		}).then((results) => {
			if (results.error) {
				if (results.data.expected) {
					return response.status(400).json({
						error: true,
						data: _.pick(errio.fromObject(results.data), [ 'name', 'message' ])
					})
				}

				logger.exception(request.context,
					'HTTP response error', errio.fromObject(results.data))
			}

			const code = results.error ? 500 : 200
			return response.status(code).json(results)
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.post('/api/v2/query', (request, response) => {
		if (_.isEmpty(request.body)) {
			return response.status(400).json({
				error: true,
				data: 'No query schema'
			})
		}

		return queryFacade.queryAPI(
			request.context,
			request.sessionToken,
			request.body.query,
			request.body.options,
			request.ip
		).then((data) => {
			return response.status(200).json({
				error: false,
				data
			})
		}).catch((error) => {
			logger.warn(request.context, 'JSON Schema query error', request.body)
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/whoami', async (request, response) => {
		try {
			const user = await authFacade.whoami(request.context, request.sessionToken, request.ip)

			return response.status(200).json({
				error: false,
				data: user
			})
		} catch (error) {
			return sendHTTPError(request, response, error)
		}
	})
}
