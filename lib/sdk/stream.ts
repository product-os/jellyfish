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

import { EventEmitter } from 'events';
import * as _ from 'lodash';
import * as io from 'socket.io-client';
import uuid = require('uuid/v4');
import { SDKInterface } from './index';
import { Card, JellySchema } from './types';

export interface StreamEventMap {
	ready: {
		id: string,
		error: false;
	};

	update: {
		id: string,
		error: false;
		data: {
			after: Card;
			before: Card | null;
		};
	};

	streamError: {
		id: string,
		error: true;
		data: string;
	};

	destroy: void;
}

/**
 * @class JellyfishStream
 *
 * @description Stream changes and updates from the server over a socket
 * connection, emitting events when changes occur.
 */
export class JellyfishStream extends EventEmitter {
	public id: string;
	private socket: SocketIOClient.Socket;
	public ready: Promise<void>;

	/**
	 * @summary Create a JellyfishStream
	 * @constructor
	 *
	 * @param {Object} query - A JSON schema used to match cards
	 * @param {Function} openSocket - A function that returns a socket connection
	 * to the API
	 * @param {Object} sdk - An instantiated instance of JellyfishSDK
	 */
	constructor(
		query: JellySchema,
		openSocket: () => Promise<SocketIOClient.Socket>,
		sdk: SDKInterface,
	) {
		super();

		this.id = uuid();
		const token = sdk.getAuthToken();

		this.ready = new Promise((resolve) => {
			openSocket().then((socket) => {
				this.socket = socket;

				this.socket.emit('query', {
					token,
					data: {
						query: _.omit(query, '$id'),
					},
					id: this.id,
				});

				this.socket.on('ready', ({ id }: StreamEventMap['ready']) => {
					if (id === this.id) {
						resolve();
					}
				});

				this.socket.on('update', ({ id, ...data }: StreamEventMap['update']) => {
					if (id === this.id) {
						this.emit('update', data);
					}
				});

				this.socket.on('streamError', ({ id, ...data }: StreamEventMap['streamError']) => {
					if (id === this.id) {
						this.emit('streamError', data);
					}
				});
			});
		});
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
	 * @memberOf JellyfishStream
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
	public on<
		EventName extends keyof StreamEventMap
	>(
		event: EventName,
		handler: (message: StreamEventMap[EventName]) => void,
	): this {
		return super.on(event, handler);
	}

	/**
	 * @summary Destroy the JellyfishStream
	 * @name on
	 * @public
	 * @function
	 * @memberOf JellyfishStream
	 *
	 * @description Remove all listeners, close the socket stream and emit
	 * a 'destroy' event
	 *
	 * @example
	 * jellyfishStream.destroy()
	 */
	public destroy(): void {
		this.emit('destroy');
		this.removeAllListeners();
		if (this.socket) {
			this.socket.emit('destroy', this.id);
		}
	}
}

/**
 * @class JellyfishStreamManager
 *
 * @description Manager for opening multiple streams through a single socket
 * connection the API
 */
export class JellyfishStreamManager {
	private socket: SocketIOClient.Socket;
	private activeEmitters: { [k: string]: JellyfishStream } = {};

	/**
	 * @summary Create a JellyfishStreamManager
	 * @constructor
	 *
	 * @param {Object} sdk - An instantiated instance of JellyfishSDK
	 */
	constructor(
		private sdk: SDKInterface,
	) {}

	/**
	 * @summary Stream updates and additions, filtered using a JSON schema
	 * @name stream
	 * @public
	 * @function
	 * @memberOf JellyfishStreamManager
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
	public async stream(query: JellySchema): Promise<JellyfishStream> {
		const emitter = new JellyfishStream(query, this.openSocket, this.sdk);

		await emitter.ready;

		this.activeEmitters[emitter.id] = emitter;

		emitter.on('destroy', () => {
			delete this.activeEmitters[emitter.id];
		});

		return emitter;
	}

	/**
	 * @summary Close main socket and remove all event emitters
	 * @name close
	 * @public
	 * @function
	 * @memberOf JellyfishStreamManager
	 *
	 * @example
	 * jellyfishStreamManager.close()
	 */
	public close(): void {
		_.forEach(this.activeEmitters, (emitter) => emitter.destroy());
		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.close();
			delete this.socket;
		}
	}

	/**
	 * @summary Open a socket to the backend server
	 * @name openSocket
	 * @public
	 * @function
	 * @memberOf JellyfishStreamManager
	 *
	 * @description Opens a socket tothe backend server, which is used to multiplex streams.
	 * Returns a promise that resolves with a socket connection once the main socket has connected
	 *
	 * @fulfils {Object} A socket.io socket connection
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishStreamManager.openSocket()
	 * 	.then((socket) => {
	 * 	 	// Do something with socket...
	 * 	})
	 */
	private openSocket = () => {
		return new Promise<SocketIOClient.Socket>((resolve) => {
			if (!this.socket) {
				const url = this.sdk.getApiUrl();
				if (!url) {
					throw new Error('jellyfish:sdk Cannot initialize websocket connection, API url is not set');
				}

				this.socket = io(url);
			}

			if (this.socket.connected) {
				return resolve(this.socket);
			}

			this.socket.on('connect', () => {
				resolve(this.socket);
			});
		});
	}
}
