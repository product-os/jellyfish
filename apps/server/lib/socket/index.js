/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const socketIo = require('socket.io')
const redisAdapter = require('socket.io-redis')
const environment = require('@balena/jellyfish-environment')
const uuid = require('@balena/jellyfish-uuid')
const express = require('express')
const http = require('http')
const basicAuth = require('express-basic-auth')
const prometheus = require('socket.io-prometheus-metrics')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const packageJSON = require('../../../../package.json')

module.exports = (jellyfish, server) => {
	const socketServer = socketIo(server, {
		pingTimeout: 60000,
		transports: [ 'websocket', 'polling' ]
	})

	socketServer.adapter(redisAdapter(environment.redis))

	const openStreams = {}

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50)

		// The query property can be either a JSON schema, view ID or a view card
		socket.on('query', (payload) => {
			if (!payload.token) {
				return socket.emit({
					error: true,
					data: 'No session token'
				})
			}

			return uuid.random().then((id) => {
				const context = {
					id: `SOCKET-REQUEST-${packageJSON.version}-${id}`
				}
				return jellyfish.stream(context, payload.token, payload.data.query, payload.data.options).then((stream) => {
					let emitCount = 0
					const updateEmitCount = () => {
						emitCount++
						if (emitCount % 100 === 0) {
							logger.info(context, `stream has emitted ${emitCount} events`, {
								query: payload.data.query
							})
						}
					}

					socket.on('queryDataset', (queryPayload) => {
						// TODO: maybe worth doing a more thorough check
						if (
							!('data' in queryPayload) ||
							!('schema' in queryPayload.data) ||
							!_.isPlainObject(queryPayload.data.schema)
						) {
							socket.emit({
								error: true,
								data: 'Malformed request for: queryDataset'
							})
						}

						stream.emit('query', queryPayload.data)
					})

					stream.on('error', (error) => {
						updateEmitCount()
						socket.emit('streamError', {
							error: true,
							data: error.message
						})
					})

					socket.on('setSchema', (schemaPayload) => {
						// TODO: maybe worth doing a more thorough check
						if (!('data' in schemaPayload) || !('schema' in schemaPayload.data)) {
							socket.emit({
								error: true,
								data: 'Malformed request for: setSchema'
							})
						}

						// When the server stream recieves a setSchema event
						// We emit setSchema to the client
						stream.emit('setSchema', schemaPayload.data)

						// Then we optionally broadcast the same setSchema event to all other clients
						// Here we should use "socket" instead of "stream"
						// so we emit to everyone not just ourselves
						if (_.get(schemaPayload, [ 'data', 'broadcast' ])) {
							schemaPayload.data.broadcast = false
							socket.broadcast.emit('setSchema broadcast', schemaPayload)
						}
					})

					openStreams[context.id] = stream

					socket.on('disconnect', () => {
						stream.close()
						Reflect.deleteProperty(openStreams, context.id)
					})

					socket.emit('ready')

					stream.on('dataset', (data) => {
						updateEmitCount()
						socket.emit('dataset', {
							error: false,
							data
						})
					})

					stream.on('data', (results) => {
						updateEmitCount()

						// The event name is changed to `update` to indicate that this is
						// partial data and not the full result set
						socket.emit('update', {
							error: false,
							data: results
						})
					})
				})
			}).catch((error) => {
				socket.emit('streamError', {
					error: true,
					data: error.message
				})
			})
		})

		socket.on('typing', (payload) => {
			if (!payload.token) {
				return socket.emit({
					error: true,
					data: 'No session token'
				})
			}

			const {
				user,
				card
			} = payload

			return socket.broadcast.emit('typing', {
				user,
				card
			})
		})
	})

	// Collect and expose socket metrics
	const metrics = prometheus.metrics(socketServer, {
		collectDefaultMetrics: true,
		createServer: false
	})
	const application = express()
	const expressServer = http.Server(application)
	application.use(basicAuth({
		users: {
			monitor: environment.metrics.token
		}
	}))
	application.get('/metrics', (req, res) => {
		res.set('Content-Type', metrics.register.contentType)
		res.end(metrics.register.metrics())
	})
	expressServer.listen(environment.metrics.ports.socket)

	return {
		close: () => {
			_.forEach(openStreams, (stream) => {
				stream.close()
			})

			return socketServer.close()
		}
	}
}
