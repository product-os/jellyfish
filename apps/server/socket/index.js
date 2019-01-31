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
					data: 'No session token',
					id: payload.id
				})
			}

			return jellyfish.stream({
				id: `SOCKET-REQUEST-${randomstring.generate(20)}`
			}, payload.token, payload.data.query).then((stream) => {
				socket.emit('ready', {
					id: payload.id
				})

				openStreams[payload.id] = stream

				const closeStream = () => {
					stream.close()
					Reflect.deleteProperty(openStreams, payload.id)
				}

				stream.on('data', (results) => {
					// The event name is changed to `update` to indicate that this is
					// partial data and not the full result set
					socket.emit('update', {
						error: false,
						data: results,
						id: payload.id
					})
				})

				socket.on('destroy', (streamId) => {
					if (payload.id === streamId) {
						closeStream()
					}
				})

				socket.on('disconnect', () => {
					closeStream()
				})
			}).catch((error) => {
				socket.emit('streamError', {
					error: true,
					data: error.message,
					id: payload.id
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
