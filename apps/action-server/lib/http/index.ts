/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird';
import { Server } from 'http';
import express from 'express';

export const http = (configuration) => {
	const application = express();

	const server = new Server(application);
	let started = false;
	application.set('port', configuration.port);

	application.get('/startup', (_request, response) => {
		if (started) {
			return response.status(200).end();
		}
		return response.status(503).end();
	});

	return {
		server,
		port: configuration.port,
		start: () => {
			return new Promise((resolve, reject) => {
				server.once('error', reject);

				// The .listen callback will be called regardless of if there is an
				// EADDRINUSE error, which means that the promise will resolve with
				// the incorrect port if the port is already in use. To get around
				// this, we add a listener for the `listening` event, which can be
				// removed if the port bind fails
				server.once('listening', () => {
					return resolve();
				});

				server.listen(application.get('port'));
			});
		},
		started: () => {
			started = true;
		},
		stop: async () => {
			await new Bluebird((resolve) => {
				server.close();
				server.once('close', resolve);
			});
		},
	};
};
