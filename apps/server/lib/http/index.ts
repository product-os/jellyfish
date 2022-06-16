import { getLogger, LogContext } from '@balena/jellyfish-logger';
import * as metrics from '@balena/jellyfish-metrics';
import type { Sync, Worker } from '@balena/jellyfish-worker';
import type { Kernel } from 'autumndb';
import errio from 'errio';
import http from 'http';
import { attachMiddlewares } from './middlewares';
import { attachRoutes } from './routes';

const logger = getLogger(__filename);

// TS-TODO: Define proper type for configuration argument
export const createServer = (logContext: LogContext, configuration: any) => {
	const application = metrics.initExpress();

	const server = new http.Server(application);
	let ready = false;
	application.set('port', configuration.port);

	/*
	 * This endpoint should very simple and should not
	 * communicate with the API by design.
	 * The idea is that this endpoint checks the container
	 * health and that only, as otherwise we are
	 * side-checking the database health, and get restarted
	 * even if the database and not the container is the
	 * problem.
	 */
	application.get('/liveness', (_request, response) => {
		return response.status(200).end();
	});

	application.get('/readiness', (_request, response) => {
		if (ready) {
			return response.status(200).end();
		}
		return response.status(503).end();
	});

	return {
		server,
		port: configuration.port,
		start: () => {
			return new Promise<void>((resolve, reject) => {
				server.once('error', reject);

				// The .listen callback will be called regardless of if there is an
				// EADDRINUSE error, which means that the promise will resolve with
				// the incorrect port if the port is already in use. To get around
				// this, we add a listener for the `listening` event, which can be
				// removed if the port bind fails
				server.once('listening', () => {
					return resolve();
				});

				server.timeout = configuration.timeout * 1000;
				server.headersTimeout = configuration.headersTimeout * 1000;
				server.requestTimeout = configuration.requestTimeout * 1000;

				server.listen(application.get('port'));
			});
		},
		ready: (kernel: Kernel, worker: Worker, options: { sync: Sync }) => {
			attachMiddlewares(logContext, application);

			attachRoutes(application, kernel, worker, {
				sync: options.sync,
			});

			// We must define 4 arguments even if we don't use them
			// otherwise Express doesn't take it as an error handler.
			// See https://expressjs.com/en/guide/using-middleware.html
			application.use((error, request, response, _next) => {
				if (error.type === 'entity.parse.failed') {
					return response.status(400).json({
						error: true,
						data: 'Invalid request body',
					});
				}

				// So we get more info about the error
				error.url = request.url;
				error.method = request.method;
				error.ip = request.ip;
				error.headers = request.headers;

				const errorObject = errio.toObject(error, {
					stack: true,
				});

				logger.exception(
					request.context || logContext,
					'Middleware error',
					error,
				);
				return response.status(error.statusCode || 500).json({
					error: true,
					data: errorObject,
				});
			});

			ready = true;
		},
		stop: async () => {
			await new Promise((resolve) => {
				server.close();
				server.once('close', resolve);
			});
		},
	};
};
