import * as Promise from 'bluebird';
import { EventEmitter } from 'events';
import { JSONSchema6 } from 'json-schema';
import * as io from 'socket.io-client';
import { Card } from '../../../Types';
import { getRequest, getToken, postRequest, queryStringEncode } from './utils';
import { API_URL } from './constants';

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

	streamError: {
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

		this.socket.on('streamError', (data: EventMap['streamError']) => {
			this.emit('streamError', data);
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

export const stream = (query: JSONSchema6 | string | Card) =>
	new JellyfishStream('query', { query });

export const query = <T = Card>(schema: JSONSchema6 | string): Promise<T[]> =>
	getRequest(`query?${queryStringEncode(schema)}`)
		.then(response => response.data.data);

export const action = (body: {
	target: string;
	action: string;
	arguments?: any;
	transient?: any;
}) => {
	if (!body.arguments) {
		body.arguments = {};
	}

	return postRequest('action', body);
};

