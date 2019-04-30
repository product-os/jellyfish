/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const socketIo = require('socket.io')
const redisAdapter = require('socket.io-redis')
const environment = require('../../../lib/environment')
const uuid = require('../../../lib/uuid')

module.exports = (jellyfish, server) => {
	const socketServer = socketIo(server, {
		transports: [ 'websocket', 'polling' ]
	})

	socketServer.adapter(redisAdapter(environment.getRedisConfiguration()))

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

			return uuid().then((id) => {
				const context = {
					id: `SOCKET-REQUEST-${id}`
				}

				return jellyfish.stream(context, payload.token, payload.data.query).then((stream) => {
					socket.emit('ready')

					openStreams[context.id] = stream

					const closeStream = () => {
						stream.close()
						Reflect.deleteProperty(openStreams, context.id)
					}

					stream.on('data', (results) => {
						// The event name is changed to `update` to indicate that this is
						// partial data and not the full result set
						socket.emit('update', {
							error: false,
							data: results
						})
					})

					socket.on('disconnect', () => {
						closeStream()
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

	return {
		close: () => {
			_.forEach(openStreams, (stream) => {
				stream.close()
			})

			return socketServer.close()
		}
	}
}
