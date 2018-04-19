import { EventEmitter } from 'events';
import { JSONSchema6 } from 'json-schema';
import * as io from 'socket.io-client';
import { Card } from '../../../Types';
import { API_URL } from './constants';
import { getToken } from './utils';

interface EventMap {
	data: {
		error: false;
		data: Card[];
	};

	update: {
		error: false;
		data: {
			after: Card;
			before: Card;
		};
	};

	error: {
		error: true;
		data: string;
	};
}

export class JellyfishStream extends EventEmitter {
	private socket: SocketIOClient.Socket;

	constructor(
		eventName: string,
		payload: any,
	) {
		super();

		this.socket = io(API_URL);

		this.socket.on('connect', () => {
			this.socket.emit(eventName, {
				token: getToken(),
				data: payload,
			});
		});

		this.socket.on('data', (data: EventMap['data']) => {
			this.emit('data', data);
		});

		this.socket.on('update', (data: EventMap['update']) => {
			this.emit('update', data);
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
		this.removeAllListeners();
		this.socket.close();
	}
}

export const streamQuery = (schema: JSONSchema6) =>
	new JellyfishStream('query', { schema });

export const streamQueryView = (view: string | Card) =>
	new JellyfishStream('queryView', { view });
