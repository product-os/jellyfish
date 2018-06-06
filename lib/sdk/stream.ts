import { EventEmitter } from 'events';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as io from 'socket.io-client';
import uuid = require('uuid/v4');
import { SDKInterface, SDKQueryOptions, StreamEventMap } from './utils';

export class JellyfishStream extends EventEmitter {
	public id: string;
	private socket: SocketIOClient.Socket;
	private unsubscribe: () => void;


	constructor(
		query: JSONSchema6,
		openSocket: () => Promise<SocketIOClient.Socket>,
		sdk: SDKInterface,
		options: SDKQueryOptions = {},
	) {
		super();

		this.id = uuid();
		const token = sdk.getAuthToken();

		if (!options.skipCache) {
			this.unsubscribe = sdk.miniJelly.watch(query, (data) => {
				this.emit('update', { data });
			});
		}

		openSocket().then((socket) => {
			this.socket = socket;

			this.socket.emit('query', {
				token,
				data: { query },
				id: this.id,
			});

			this.socket.on('update', ({ id, ...data }: StreamEventMap['update']) => {
				if (id === this.id) {
					const { after, before } = data.data;
					// If there was no prior card, double check to see if there is a proxy
					// card in the local db
					if (!options.skipCache && !before) {
						data.data.before = sdk.miniJelly.getById(after.id);
						sdk.miniJelly.upsert(after);
					}
					this.emit('update', data);
				}
			});

			this.socket.on('streamError', ({ id, ...data }: StreamEventMap['streamError']) => {
				if (id === this.id) {
					this.emit('streamError', data);
				}
			});
		});
	}

	// The `on` method is overloaded so we can add strict typings for event names
	// and response data
	public on<
		EventName extends keyof StreamEventMap
	>(
		event: EventName,
		handler: (message: StreamEventMap[EventName]) => void,
	): this {
		return super.on(event, handler);
	}

	public destroy() {
		this.emit('destroy');
		this.removeAllListeners();
		if (this.socket) {
			this.socket.emit('destroy', this.id);
		}
		if (this.unsubscribe) {
			this.unsubscribe();
		}
	}
}

export class JellyfishStreamManager {
	private socket: SocketIOClient.Socket;
	private activeEmitters: { [k: string]: JellyfishStream } = {};

	constructor(
		private sdk: SDKInterface,
	) {}

	/**
	 * Returns an event emitter that emits response data for the given query
	 */
	public stream(query: JSONSchema6, options: SDKQueryOptions = {}) {
		const emitter = new JellyfishStream(query, this.openSocket, this.sdk, options);
		this.activeEmitters[emitter.id] = emitter;

		emitter.on('destroy', () => {
			delete this.activeEmitters[emitter.id];
		});

		return emitter;
	}

	/**
	 * Close main socket and remove all event emitters
	 */
	public close() {
		_.forEach(this.activeEmitters, (emitter) => emitter.destroy());
		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.close();
			delete this.socket;
		}
	}

	/**
	 * Returns a promise that resolves with a socket connection once the main socket has connected
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
