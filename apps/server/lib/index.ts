import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import { bootstrap } from './bootstrap';
import { getPlugins } from './plugins';
import cluster from 'node:cluster';
import { cpus, networkInterfaces } from 'node:os';
import process from 'node:process';
import { HandoverPeer } from 'handover-lib';
import _ from 'lodash';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../package.json');

const logger = getLogger(__filename);

let numCPUs = cpus().length;

const MAX_WORKERS = process.env.MAX_WORKERS;
if (MAX_WORKERS) {
	numCPUs = Math.min(numCPUs, parseInt(MAX_WORKERS, 10));
}

const serverId = Math.round(Math.random() * 1000);

let hostId = environment.pod.name; // on a docker-compose would be 'localhost'
if (hostId === 'localhost') {
	const localAddresses = networkInterfaces()?.eth0;
	if (localAddresses && localAddresses[0] && localAddresses[0].address) {
		hostId = 'IP-' + localAddresses[0].address;
	}
}

const baseLogId = `SERVER-ID-${'[' + serverId + ']'}-PID-${
	process.pid
}-${hostId}-${packageJSON.version}`;

const DEFAULT_CONTEXT = {
	id: `ERROR-${baseLogId}`,
};

const onError = (error, message = 'Server error', ctx = DEFAULT_CONTEXT) => {
	logger.error(ctx, message, error);
	console.error({
		context: ctx,
		message,
		error,
	});
	console.error('Process exiting');
	setTimeout(() => {
		process.exit(1);
	}, 1000);
};

/**
 * `unhandledRejection` event means that a promise rejection wasn't handled.
 * Log query read timeouts, exit the process on other cases
 */
process.on('unhandledRejection', (reason: Error | unknown, promise) => {
	if (_.isError(reason) && reason.message === 'Query read timeout') {
		// Don't exit, just log
		logger.error(DEFAULT_CONTEXT, 'Unhandled Rejection', {
			reason: reason.stack || reason,
			promise,
		});
	} else {
		return onError(reason, 'Unhandled Rejection');
	}
});

const startDate = new Date();
const run = async () => {
	if (cluster.isPrimary) {
		const context = {
			id: `${baseLogId}-primary`,
		};
		const handoverPeer = new HandoverPeer(startDate, context);

		logger.info(
			context,
			`Primary worker started, spawning ${numCPUs} workers`,
			{
				time: startDate.getTime(),
			},
		);

		let activeWorkers = 0;
		const maxWorkers = numCPUs;
		// Wait until all workers are ready
		const workersNeeded = maxWorkers;
		// Fork workers.
		for (let i = 0; i < maxWorkers; i++) {
			cluster.fork();
		}
		cluster.on('exit', (worker, code, signal) => {
			activeWorkers--;
			if (worker.exitedAfterDisconnect === true) {
				logger.info(
					context,
					`worker ${worker?.process?.pid} exited (${
						signal || code
					}). activeWorkers ${activeWorkers}`,
				);
			} else {
				logger.info(
					context,
					`worker ${worker?.process?.pid} died (${
						signal || code
					}). activeWorkers ${activeWorkers}. Forking again`,
				);
				cluster.fork();
			}
		});

		cluster.on('online', (worker) => {
			logger.debug(
				context,
				`Worker ${worker.id} responded after it was forked`,
			);
		});

		logger.info(context, `Waiting for ${workersNeeded} workers to start`);

		cluster.on('message', (worker, message) => {
			if (message?.msg === 'worker-started') {
				activeWorkers++;
				logger.info(
					context,
					`Worker ${worker.id} worker-started. activeWorkers ${activeWorkers}`,
				);
				if (activeWorkers === workersNeeded) {
					logger.info(context, `All ${workersNeeded} needed workers started.`);
					handoverPeer.startBroadcasting();
				}
			} else if (message?.msg === 'DONE') {
				// Ignored, is handled by the shutdown code
			} else {
				logger.warn(context, `Unknown message received from worker`, message);
			}
		});

		// handoverPeer will call this function when we're shutting down. It will `await` until it returns to signal that the handover is done.
		// Reminder that the handover ( new instance takes the hostname ) is not performed until the old container is killed, so we have to balance between clean-shutdown and almost-zero-downtime
		// Here we go with the "almost-zero-downtime": don't stop servicing requests. The container may get killed while it's processing a request
		const shutdownCallback = async () => {
			logger.info(context, `Keeping the workers alive during handover.`);
		};

		handoverPeer.startListening(shutdownCallback);
	} else {
		const context = {
			id: `${baseLogId}-worker#${cluster.worker?.id}`,
		};

		logger.info(context, `Starting server with worker ${cluster.worker?.id}`, {
			time: startDate.getTime(),
		});

		try {
			const options = {
				plugins: getPlugins(),
				onError,
			};

			bootstrap(context, options)
				.then((server) => {
					const endDate = new Date();
					const timeToStart = endDate.getTime() - startDate.getTime();

					logger.info(context, 'Server started', {
						time: timeToStart,
						port: server.port,
					});

					process.send!({ msg: 'worker-started' });

					cluster.worker?.on('message', async (msg) => {
						if (msg === 'SHUTDOWN') {
							await server.close();
							logger.info(context, `${cluster.worker?.id}:Server stopped`);
							process.send!({ msg: 'DONE' });
							// bye
							setTimeout(() => cluster.worker?.kill(), 100);
						}
					});

					if (timeToStart > 10000) {
						logger.warn(context, 'Slow server startup time', {
							time: timeToStart,
						});
					}
				})
				.catch((error) => {
					logger.error(context, 'Server error', error);
					process.exit(1);
				});
		} catch (error) {
			onError(error);
		}
	}
};

run();
