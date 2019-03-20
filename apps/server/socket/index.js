/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const randomstring = require('randomstring')
const _ = require('lodash')
const socketIo = require('socket.io')

module.exports = (jellyfish, server) => {
	const socketServer = socketIo(server)

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

			const id = `SOCKET-REQUEST-${randomstring.generate(20)}`

			return jellyfish.stream({
				id
			}, payload.token, payload.data.query).then((stream) => {
				socket.emit('ready')

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
						data: results
					})
				})

				socket.on('disconnect', () => {
					closeStream()
				})
			}).catch((error) => {
				socket.emit('streamError', {
					error: true,
					data: error.message
				})
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
