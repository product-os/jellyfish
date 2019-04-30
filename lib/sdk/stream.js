/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const io = require('socket.io-client')
const uuid = require('uuid/v4')

/**
 * @class JellyfishStreamManager
 *
 * @description Manager for opening multiple streams through a single socket
 * connection the API
 */
class JellyfishStreamManager {
	/**
	 * @summary Create a JellyfishStreamManager
	 * @class
	 *
	 * @param {Object} sdk - An instantiated instance of JellyfishSDK
	 */
	constructor (sdk) {
		this.sdk = sdk
		this.activeSockets = {}
	}

	/**
	 * @summary Stream updates and additions, filtered using a JSON schema
	 * @name stream
	 * @public
	 * @function
	 *
	 * @param {Object} query - An optional JSON schema used to match cards
	 * Returns a socket object that emits response data for the given query
	 *
	 * @fulfil {JellyfishStream} An instantiated JellyfishStream
	 * @returns {Promise}
	 *
	 * @example
	 * const schema = {
	 * 	type: 'object',
	 * 	properies: {
	 * 		type: {
	 * 			const: 'thread'
	 * 		}
	 * 	}
	 * };
	 *
	 * const stream = jellyfishStreamManager.stream(schema)
	 *
	 * stream.on('update', (data) => {
	 * 	console.log(data);
	 * })
	 *
	 * stream.on('streamError', (error) => {
	 * 	console.error(error);
	 * })
	 */
	async stream (query) {
		const url = this.sdk.getApiUrl()
		if (!url) {
			throw new Error('jellyfish:sdk Cannot initialize websocket connection, API url is not set')
		}

		const token = this.sdk.getAuthToken()

		// Create a new socket.io client connected to the API
		const socket = io(url, {
			transports: [ 'websocket', 'polling' ]
		})

		// Generate a unique identifier for this client
		socket.id = uuid()

		// When the client connects, send the query that should be streamed as well
		// as an authentication token

		if (query) {
			socket.on('connect', () => {
				socket.emit('query', {
					token,
					data: {
						query: _.omit(query, '$id')
					}
				})
			})

			// Wait for the API stream to become ready before proceeeding
			await new Promise((resolve, reject) => {
				socket.on('ready', () => {
					resolve()
				})
			})
		}

		// Cache the client so that it can be managed easily
		this.activeSockets[socket.id] = socket

		// Add a custom `close` method to assist with discarding dead streams
		const close = socket.close.bind(socket)
		socket.close = () => {
			Reflect.deleteProperty(this.activeSockets, socket.id)
			close()
			socket.removeAllListeners()
		}

		// Add a custom `type` method to indicate that a user is typing
		socket.type = (user, card) => {
			socket.emit('typing', {
				token,
				user,
				card
			})
		}

		return socket
	}

	/**
	 * @summary Close main socket and remove all event socket
	 * @name close
	 * @public
	 * @function
	 *
	 * @example
	 * jellyfishStreamManager.close()
	 */
	close () {
		_.forEach(this.activeSockets, (socket) => {
			return socket.close()
		})
	}
}
exports.JellyfishStreamManager = JellyfishStreamManager
