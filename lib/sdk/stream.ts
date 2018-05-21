import { EventEmitter } from 'events';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as io from 'socket.io-client';
import uuid = require('uuid/v4');
import { Card } from '../Types';
import { SDKInterface } from './utils';

interface EventMap {
	data: {
		id: string,
		error: false;
		data: Card[];
	};

	update: {
		id: string,
		error: false;
		data: {
			after: Card;
			before: Card;
		};
	};

	streamError: {
		id: string,
		error: true;
		data: string;
	};

	destroy: void;
}

export class JellyfishStream extends EventEmitter {
	public id: string;
	private socket: SocketIOClient.Socket;

	constructor(
		eventName: string,
		payload: any,
		openSocket: () => Promise<SocketIOClient.Socket>,
		token?: string,
	) {
		super();

		this.id = uuid();

		openSocket().then((socket) => {
			this.socket = socket;

			this.socket.emit(eventName, {
				token,
				data: payload,
				id: this.id,
			});

			this.socket.on('data', ({ id, ...data }: EventMap['data']) => {
				if (id === this.id) {
					this.emit('data', data);
				}
			});

			this.socket.on('update', ({ id, ...data }: EventMap['update']) => {
				if (id === this.id) {
					this.emit('update', data);
				}
			});

			this.socket.on('streamError', ({ id, ...data }: EventMap['streamError']) => {
				if (id === this.id) {
					this.emit('streamError', data);
				}
			});
		});
	}

	// The `on` method is overloaded so we can add strict typings for event names
	// and response data
	public on<
		EventName extends keyof EventMap
	>(
		event: EventName,
		handler: (message: EventMap[EventName]) => void,
	): this {
		return super.on(event, handler);
	}

	public destroy() {
		this.emit('destroy');
		this.removeAllListeners();
		this.socket.emit('destroy', this.id);
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
	public stream(query: JSONSchema6 | string | Card) {
		const emitter = new JellyfishStream('query', { query }, this.openSocket, this.sdk.getAuthToken());
		this.activeEmitters[emitter.id] = emitter;
		emitter.on('destroy', () => delete this.activeEmitters[emitter.id]);

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
