import { EventEmitter } from 'events';
import * as io from 'socket.io-client';
import { Card } from '../Types';

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
		apiUrl: string,
		token?: string,
	) {
		super();

		this.socket = io(apiUrl);

		this.socket.on('connect', () => {
			this.socket.emit(eventName, {
				token,
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
