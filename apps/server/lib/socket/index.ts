import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import * as prometheus from '@balena/socket-prometheus-metrics';
import type {
	AutumnDBSession,
	Contract,
	JsonSchema,
	Kernel,
	QueryOptions,
} from 'autumndb';
import express from 'express';
import basicAuth from 'express-basic-auth';
import http from 'http';
import _ from 'lodash';
import * as socketIo from 'socket.io';
import redisAdapter from 'socket.io-redis';
import { v4 as uuidv4 } from 'uuid';
import { getSessionFromToken } from '../auth';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../../package.json');

interface ClientToServerEvents {
	query: (payload: {
		token: string;
		data: {
			query: JsonSchema;
		};
	}) => void;
	queryDataset: (payload: {
		data: {
			schema: JsonSchema;
			options: QueryOptions;
		};
	}) => void;
	setSchema: (payload: {
		data: {
			schema: JsonSchema;
		};
	}) => void;
	typing: (payload: { token: string; user: string; card: string }) => void;
}

interface ServerToClientEvents {
	streamError: (payload: { error: boolean; data: any }) => void;
	ready: () => void;
	dataset: (payload: {
		error: boolean;
		data: {
			id: string;
			cards: Contract[];
		};
	}) => void;
	update: (payload: {
		error: boolean;
		data: {
			id: string;
			contractType: string;
			type: string;
			after: null | Contract;
		};
	}) => void;
	typing: (payload: { user: string; card: string }) => void;
}

export const attachSocket = (kernel: Kernel, server) => {
	const socketServer = new socketIo.Server<
		ClientToServerEvents,
		ServerToClientEvents
	>(server, {
		pingTimeout: 60000,
		transports: ['websocket', 'polling'],
		perMessageDeflate: true,
	});

	socketServer.adapter(redisAdapter.createAdapter(environment.redis as any));

	const openStreams: any = {};

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50);
		const id = uuidv4();

		const context = {
			id: `SOCKET-REQUEST-V-${packageJSON.version}-ENV-${
				process.env.NODE_ENV ? process.env.NODE_ENV.substring(0, 4) : '?'
			}-${id}`,
		};

		const ready = new Promise<{ stream: any; payload: any }>((resolve) => {
			// The query property can be either a JSON schema, view ID or a view contract
			socket.on('query', async (payload) => {
				const { token } = payload;
				if (!token) {
					return socket.emit('streamError', {
						error: true,
						data: 'No session token',
					});
				}

				let stream: any = null;
				let session: AutumnDBSession;

				try {
					session = await getSessionFromToken(context, kernel, token);
					stream = await kernel.stream(context, session, payload.data.query);
				} catch (err: any) {
					return socket.emit('streamError', {
						error: true,
						data: err.message,
					});
				}

				stream.on('error', (error) => {
					socket.emit('streamError', {
						error: true,
						data: error.message,
					});
				});

				stream.on('dataset', (data) => {
					socket.emit('dataset', {
						error: false,
						data,
					});
				});

				stream.on('data', (results) => {
					// The event name is changed to `update` to indicate that this is
					// partial data and not the full result set
					socket.emit('update', {
						error: false,
						data: results,
					});
				});

				openStreams[context.id] = stream;

				socket.emit('ready');

				resolve({
					stream,
					payload,
				});
			});
		});

		const emit = (() => {
			return async <TData>(event: string, data: TData) => {
				const { stream } = await ready;
				stream.emit(event, data);
			};
		})();

		const close = async () => {
			const { stream } = await ready;
			stream.close();
		};

		socket.on('queryDataset', (queryPayload) => {
			// TODO: maybe worth doing a more thorough check
			if (
				!('data' in queryPayload) ||
				!('schema' in queryPayload.data) ||
				!_.isPlainObject(queryPayload.data.schema)
			) {
				socket.emit({
					error: true,
					data: 'Malformed request for: queryDataset',
				} as any);
			}

			emit('query', queryPayload.data);
		});

		socket.on('setSchema', (schemaPayload) => {
			// TODO: maybe worth doing a more thorough check
			if (!('data' in schemaPayload) || !('schema' in schemaPayload.data)) {
				socket.emit({
					error: true,
					data: 'Malformed request for: setSchema',
				} as any);
			}

			emit('setSchema', schemaPayload.data);
		});

		socket.on('disconnect', () => {
			close();
			Reflect.deleteProperty(openStreams, context.id);
		});

		socket.on('typing', (payload) => {
			if (!payload.token) {
				return socket.emit({
					error: true,
					data: 'No session token',
				} as any);
			}

			const { user, card } = payload;

			return socket.broadcast.emit('typing', {
				user,
				card,
			});
		});
	});

	// Collect and expose socket metrics
	const metrics = prometheus.metrics(socketServer, {
		collectDefaultMetrics: true,
		createServer: false,
	});
	const application = express();
	const expressServer = new http.Server(application);
	application.use(
		basicAuth({
			users: {
				monitor: environment.metrics.token,
			},
		}),
	);
	application.get('/metrics', async (_req, res) => {
		res.set('Content-Type', metrics.register.contentType);
		res.send(await metrics.register.metrics());
		res.end();
	});
	expressServer.listen(environment.metrics.ports.socket);

	return {
		close: () => {
			_.forEach(openStreams, (stream) => {
				stream.close();
			});

			expressServer.close();
			socketServer.close();
		},
	};
};
