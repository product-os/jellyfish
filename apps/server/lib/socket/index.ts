/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import * as socketIo from 'socket.io';
import redisAdapter from 'socket.io-redis';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import http from 'http';
import basicAuth from 'express-basic-auth';
import * as prometheus from '@balena/socket-prometheus-metrics';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../../package.json');

const logger = getLogger(__filename);

export const attachSocket = (jellyfish, server) => {
	const socketServer = new socketIo.Server(server, {
		pingTimeout: 60000,
		transports: ['websocket', 'polling'],
	});

	socketServer.adapter(redisAdapter.createAdapter(environment.redis as any));

	const openStreams: any = {};

	socketServer.on('connection', (socket) => {
		socket.setMaxListeners(50);

		// The query property can be either a JSON schema, view ID or a view card
		socket.on('query', (payload) => {
			if (!payload.token) {
				return socket.emit({
					error: true,
					data: 'No session token',
				} as any);
			}

			const id = uuidv4();
			return new Promise((resolve) => {
				const context = {
					id: `SOCKET-REQUEST-${packageJSON.version}-${id}`,
				};

				return resolve(
					jellyfish
						.stream(context, payload.token, payload.data.query)
						.then((stream) => {
							let emitCount = 0;
							const updateEmitCount = () => {
								emitCount++;
								if (emitCount % 100 === 0) {
									logger.info(
										context,
										`stream has emitted ${emitCount} events`,
										{
											query: payload.data.query,
										},
									);
								}
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

								stream.emit('query', queryPayload.data);
							});

							stream.on('error', (error) => {
								updateEmitCount();
								socket.emit('streamError', {
									error: true,
									data: error.message,
								});
							});

							socket.on('setSchema', (schemaPayload) => {
								// TODO: maybe worth doing a more thorough check
								if (
									!('data' in schemaPayload) ||
									!('schema' in schemaPayload.data)
								) {
									socket.emit({
										error: true,
										data: 'Malformed request for: setSchema',
									} as any);
								}

								stream.emit('setSchema', schemaPayload.data);
							});

							openStreams[context.id] = stream;

							socket.on('disconnect', () => {
								stream.close();
								Reflect.deleteProperty(openStreams, context.id);
							});

							socket.emit('ready');

							stream.on('dataset', (data) => {
								updateEmitCount();
								socket.emit('dataset', {
									error: false,
									data,
								});
							});

							stream.on('data', (results) => {
								updateEmitCount();

								// The event name is changed to `update` to indicate that this is
								// partial data and not the full result set
								socket.emit('update', {
									error: false,
									data: results,
								});
							});
						}),
				);
			}).catch((error) => {
				socket.emit('streamError', {
					error: true,
					data: error.message,
				});
			});
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
