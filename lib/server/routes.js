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

const randomstring = require('randomstring')
const _ = require('lodash')

exports.bindRoutes = (jellyfish, app, socketServer) => {
	const openStreams = {}

	app.once('close', () => {
		_.forEach(openStreams, (stream) => {
			stream.close()
		})
	})

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50)
		const ctx = {
			id: `REQUEST-${randomstring.generate(20)}`
		}

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
