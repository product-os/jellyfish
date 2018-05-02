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
const express = require('express')
const Promise = require('bluebird')
const bodyParser = require('body-parser')
const socketIo = require('socket.io')
const debug = require('debug')('jellyfish:api')
const path = require('path')
const core = require('./core')
const ActionRequestWorker = require('./actions')
const utils = require('./utils')
const app = express()
const server = require('http').Server(app)
const socketServer = socketIo(server)

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

if (app.get('env') === 'production') {
	app.set('port', process.env.PORT)
	app.set('db-port', process.env.DB_PORT)
	app.set('db-host', process.env.DB_HOST)
	app.set('db-user', process.env.DB_USER)
	app.set('db-password', process.env.DB_PASSWORD)
	app.set('db-cert', process.env.DB_CERT)
	app.set('actions-username', process.env.ACTIONS_USERNAME)
	app.set('actions-password', process.env.ACTIONS_PASSWORD)
	app.set('actions-email', process.env.ACTIONS_EMAIL)
} else {
	app.set('port', 8000)
	app.set('db-port', 28015)
	app.set('db-host', 'localhost')
	app.set('db-user', '')
	app.set('db-password', '')
	app.set('db-cert', null)
	app.set('actions-username', 'actions')
	app.set('actions-password', 'test')
	app.set('actions-email', 'accounts+jellyfish@resin.io')
}

app.set('database', process.env.SERVER_DATABASE || 'jellyfish')

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

module.exports = Promise.resolve(core.create({
	tables: {
		cards: 'cards',
		requests: 'requests',
		sessions: 'sessions'
	},
	backend: {
		host: app.get('db-host'),
		port: app.get('db-port'),
		user: app.get('db-user'),
		password: app.get('db-password'),
		certificate: app.get('db-cert'),
		database: app.get('database')
	}
})).tap((jellyfish) => {
	return Promise.each([
		require('../default-cards/contrib/action-create-session.json'),
		require('../default-cards/contrib/action-create-user.json'),
		require('../default-cards/contrib/action-delete-card.json'),
		require('../default-cards/contrib/action-restore-card.json'),
		require('../default-cards/contrib/action-update-email.json'),
		require('../default-cards/contrib/action-upsert-card.json'),
		require('../default-cards/contrib/action-create-event.json'),
		require('../default-cards/contrib/action-create-card.json'),
		require('../default-cards/contrib/action-update-card.json'),
		require('../default-cards/contrib/chat-message.json'),
		require('../default-cards/contrib/chat-thread.json'),
		require('../default-cards/contrib/repo.json'),
		require('../default-cards/contrib/scratchpad-entry.json'),
		require('../default-cards/contrib/subscription.json'),
		require('../default-cards/contrib/create.json'),
		require('../default-cards/contrib/event.json'),
		require('../default-cards/contrib/update.json'),
		require('../default-cards/contrib/view-active.json'),
		require('../default-cards/contrib/view-all-chat-messages.json'),
		require('../default-cards/contrib/view-all-chat-threads.json'),
		require('../default-cards/contrib/view-all-repos.json'),
		require('../default-cards/contrib/view-all-users.json'),
		require('../default-cards/contrib/view-all-views.json'),
		require('../default-cards/contrib/view-my-mentions.json'),
		require('../default-cards/contrib/view-non-executed-action-requests.json'),
		require('../default-cards/contrib/view-read-user-community.json'),
		require('../default-cards/contrib/view-read-user-guest.json'),
		require('../default-cards/contrib/view-read-user-team.json'),
		require('../default-cards/contrib/view-read-user-team-admin.json'),
		require('../default-cards/contrib/view-scratchpad.json'),
		require('../default-cards/contrib/view-write-user-guest.json')
	], (card) => {
		debug(`Inserting ${card.slug}`)
		return jellyfish.insertCard(jellyfish.sessions.admin, card, {
			override: true
		})
	})
}).then((jellyfish) => {
	return jellyfish.insertCard(jellyfish.sessions.admin, require('../default-cards/contrib/user-guest.json'), {
		override: true
	}).then((guestUserId) => {
		return jellyfish.insertCard(jellyfish.sessions.admin, {
			slug: 'session-guest',
			type: 'session',
			links: [],
			tags: [],
			active: true,
			data: {
				actor: guestUserId
			}
		}, {
			override: true
		})
	}).then((guestUserSession) => {
		return ActionRequestWorker.setup(jellyfish, jellyfish.sessions.admin, {
			username: app.get('actions-username'),
			password: app.get('actions-password'),
			email: app.get('actions-email')
		}).then((actionsSession) => {
			console.log(actionsSession)
			return new ActionRequestWorker(jellyfish, actionsSession)
		}).then((worker) => {
			worker.start().then((actionServer) => {
				actionServer.on('error', (error) => {
					throw error
				})

				actionServer.on('request', (request) => {
					debug(`Processed action request: ${request.id}`)
				})

				// Gets a query schema from a schema, view card or view id
				const loadSchema = (input, token) => {
					return Promise.try(() => {
						if (_.isString(input)) {
							// Try and load the view by id first
							return jellyfish.getCardById(token, input)
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

				// A middleware that retrieves a Bearer token and attach it to the request object
				// as `sessionToken`
				const authorize = (request, response, next) => {
					const authorization = request.headers.authorization

					const token = _.last(_.split(authorization, ' '))

					request.sessionToken = token || guestUserSession

					return next()
				}

				app.get('/', (request, response) => {
					response.sendFile(path.join('dist', 'index.html'))
				})

				app.post('/api/v1/login', (request, response) => {
					if (_.isEmpty(request.body)) {
						return response.status(400).json({
							error: true,
							data: 'No login credentials'
						})
					}

					return utils.login(jellyfish, guestUserSession, worker, {
						username: request.body.username,
						password: request.body.password
					}).then((data) => {
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
				})

				/**
				 * Queries the database for cards and returns them as an array.
				 * Accepts either a serialized JSON schema as qs params, or a view id or view card as the `query` parameter.
				 */
				app.post('/api/v1/query', authorize, (request, response) => {
					if (_.isEmpty(request.body)) {
						return error400('No query schema', response)
					}

					const query = request.body.query || request.body

					const handler = loadSchema(query, request.sessionToken)
						.then((schema) => {
							return jellyfish.query(request.sessionToken, schema)
						})

					return respond(handler, response)
				})

				app.post('/api/v1/action', authorize, (request, response) => {
					if (_.isEmpty(request.body)) {
						return error400('No action request', response)
					}

					debug(`Requesting action: ${request.body.action} -> ${request.body.target}`)

					const handler = utils.executeAndWaitAction(
						jellyfish,
						request.sessionToken,
						worker, {
							targetId: request.body.target,
							action: request.body.action,
							arguments: request.body.arguments
						}
					)

					return respond(handler, response)
				})

				server.listen(app.get('port'), () => {
					console.log(`HTTP app listening on port ${app.get('port')}!`)
				})

				socketServer.on('connection', (socket) => {
					// The query property can be either a JSON schema, view ID or a view card
					socket.on('query', ({
						token, data: {
							query
						}
					}) => {
						if (!token) {
							return socket.emit({
								error: true,
								data: 'No session token'
							})
						}

						return loadSchema(query, token)
							.tap((schema) => {
								// Since `.stream()` won't respond with data until a change is made,
								// emit the results of the query first
								return jellyfish.query(token, schema).then((results) => {
									socket.emit('data', {
										error: false,
										data: results
									})
								})
							})
							.then((schema) => {
								return jellyfish.stream(token, schema)
							})
							.then((stream) => {
								stream.on('data', (results) => {
									// The event name is changed to `update` to indicate that this is
									// partial data and not the full result set
									socket.emit('update', {
										error: false,
										data: results
									})
								})

								socket.on('disconnect', () => {
									stream.close()
								})
							})
							.catch((error) => {
								socket.emit('streamError', {
									error: true,
									data: error.message
								})
							})
					})
				})
			}).catch((error) => {
				throw error
			})
		})
	})
})
