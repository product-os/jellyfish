/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	EventEmitter
} = require('events')
const _ = require('lodash')
const io = require('socket.io-client')
const uuid = require('uuid/v4')

/**
 * @class JellyfishStream
 *
 * @description Stream changes and updates from the server over a socket
 * connection, emitting events when changes occur.
 */
class JellyfishStream extends EventEmitter {
	/**
	 * @summary Create a JellyfishStream
	 * @class
	 *
	 * @param {Object} query - A JSON schema used to match cards
	 * @param {Function} openSocket - A function that returns a socket connection
	 * to the API
	 * @param {Object} sdk - An instantiated instance of JellyfishSDK
	 */
	constructor (query, openSocket, sdk) {
		super()
		this.id = uuid()
		const token = sdk.getAuthToken()
		this.ready = new Promise((resolve) => {
			openSocket().then((socket) => {
				this.socket = socket
				this.socket.emit('query', {
					token,
					data: {
						query: _.omit(query, '$id')
					},
					id: this.id
				})
				this.socket.on('ready', ({
					id
				}) => {
					if (id === this.id) {
						resolve()
					}
				})
				this.socket.on('update', (payload) => {
					if (payload.id === this.id) {
						this.emit('update', payload.data)
					}
				})
				this.socket.on('streamError', (payload) => {
					if (payload.id === this.id) {
						this.emit('streamError', payload.data)
					}
				})
			})
		})
	}

	/**
	 * Callback for 'update' event listeners
	 *
	 * @callback updateCallback
	 * @params {Object} payload - The event payload
	 * @params {String} payload.id - Identifier for the JellyfishStream instance
	 * @params {Boolean} payload.error - True if there was an error, false
	 *         otherwise
	 * @params {Object} payload.data - The update data
	 * @params {Object|null} payload.data.before - The element before the update
	 *         if the value is null, this indicates that the element is new
	 * @params {Object} payload.data.after - The element after the update
	 */

	/**
	 * Callback for 'streamError' event listeners
	 *
	 * @callback streamErrorCallback
	 * @params {Object} payload - The event payload
	 * @params {String} payload.id - Identifier for the JellyfishStream instance
	 * @params {Boolean} payload.error - True, indicating that an error occurred
	 * @params {String} payload.data - The error message
	 */

	/**
	 * @summary Listen to stream events
	 * @name on
	 * @public
	 * @function
	 *
	 * @description Listen to stream events emitted by this instance.
	 * Note: The `on` method is overloaded so strict typings for event names
	 * and response data can be used
	 *
	 * @param {'update'|'streamError'} event - The name of the event to listen to
	 * @param {updateCallback|streamErrorCallback} handler - A callback to run
	 *
	 * @returns {Object} The JellyfishStream instance
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
	 * jellyfishStream.on('update', (data) => {
	 * 	console.log(data);
	 * })
	 *
	 * jellyfishStream.on('streamError', (error) => {
	 * 	console.error(error);
	 * })
	 */
	on (event, handler) {
		return super.on(event, handler)
	}

	/**
	 * @summary Destroy the JellyfishStream
	 * @name on
	 * @public
	 * @function
	 *
	 * @description Remove all listeners, close the socket stream and emit
	 * a 'destroy' event
	 *
	 * @example
	 * jellyfishStream.destroy()
	 */
	destroy () {
		this.emit('destroy')
		this.removeAllListeners()
		if (this.socket) {
			this.socket.emit('destroy', this.id)
		}
	}
}
exports.JellyfishStream = JellyfishStream

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
		this.activeEmitters = {}

		/**
		 * @summary Open a socket to the backend server
		 * @name openSocket
		 * @public
		 * @function
		 *
		 * @description Opens a socket tothe backend server, which is used to multiplex streams.
		 * Returns a promise that resolves with a socket connection once the main socket has connected
		 *
		 * @returns {Object} A socket.io socket connection
		 *
		 * @example
		 * jellyfishStreamManager.openSocket()
		 * 	.then((socket) => {
		 * 	 	// Do something with socket...
		 * 	})
		 */
		this.openSocket = () => {
			// eslint-disable-next-line consistent-return
			return new Promise((resolve) => {
				if (!this.socket) {
					const url = this.sdk.getApiUrl()
					if (!url) {
						throw new Error('jellyfish:sdk Cannot initialize websocket connection, API url is not set')
					}
					this.socket = io(url)
				}
				if (this.socket.connected) {
					return resolve(this.socket)
				}

				this.socket.on('connect', () => {
					resolve(this.socket)
				})
			})
		}
	}

	/**
	 * @summary Stream updates and additions, filtered using a JSON schema
	 * @name stream
	 * @public
	 * @function
	 *
	 * @param {Object} query - A JSON schema used to match cards
	 * Returns an event emitter that emits response data for the given query
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
		const emitter = new JellyfishStream(query, this.openSocket, this.sdk)
		await emitter.ready
		this.activeEmitters[emitter.id] = emitter
		emitter.on('destroy', () => {
			Reflect.deleteProperty(this.activeEmitters, emitter.id)
		})
		return emitter
	}

	/**
	 * @summary Close main socket and remove all event emitters
	 * @name close
	 * @public
	 * @function
	 *
	 * @example
	 * jellyfishStreamManager.close()
	 */
	close () {
		_.forEach(this.activeEmitters, (emitter) => {
			return emitter.destroy()
		})
		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.close()
			Reflect.deleteProperty(this, 'socket')
		}
	}
}
exports.JellyfishStreamManager = JellyfishStreamManager
