import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import { bootstrap } from './bootstrap';
import { getPlugins } from './plugins';
import cluster from 'node:cluster';
import { cpus } from 'node:os';
import os from 'node:os';
import process from 'node:process';
import { HandoverPeer } from 'handover-lib';
import { HandoverStatus } from 'handover-lib';
import _ from 'lodash';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../package.json');

const logger = getLogger(__filename);

let numCPUs = cpus().length;

// period between notifiying our "DOWN" status and starting the shutdown process
const SHUTDOWN_GRACE_PERIOD = 500;

const MAX_WORKERS = process.env.MAX_WORKERS;
if (MAX_WORKERS) {
	numCPUs = Math.min(numCPUs, parseInt(MAX_WORKERS, 10));
}

const serverId = Math.round(Math.random() * 1000);

let hostId = environment.pod.name; // on a docker-compose would be 'localhost'
if (hostId === 'localhost') {
	const localAddresses = os
		.networkInterfaces()
		?.eth0?.filter((addr) => addr.family === 'IPv4');
	if (localAddresses && localAddresses[0] && localAddresses[0].address) {
		hostId = 'IP-' + localAddresses[0].address;
	}
}

const baseLogId = `SERVER-ID-${serverId}-PID-${process.pid}-H-${hostId}-V-${
	packageJSON.version
}-ENV-${process.env.NODE_ENV ? process.env.NODE_ENV.substring(0, 4) : '?'}`;

const DEFAULT_CONTEXT = {
	id: `ERROR-${baseLogId}`,
};

const onError = (error, message = 'Server error', ctx = DEFAULT_CONTEXT) => {
	if (_.isError(error)) {
		logger.exception(ctx, message, error);
	} else {
		logger.error(ctx, message, error);
	}
};

/**
 * `unhandledRejection` event means that a promise rejection wasn't handled.
 * Log but don't exit the process because that may cause an operation to be interrupted
 * and leave the system inconsistent.
 */
process.on('unhandledRejection', (reason: Error | unknown, _promise) => {
	return onError(reason, 'Unhandled Rejection');
});

// This is where we perform the drain
// It will `await` until it returns to signal that the handover is done.
const shutdownGracefully = async (context) => {
	// logger.info(context, `Keeping the workers alive during handover.`);
	let exitedWorkers = 0;
	const activeWorkers = Object.values(cluster.workers || {});
	for (const worker of activeWorkers) {
		worker?.on('message', (message) => {
			if (message?.msg === 'DONE') {
				exitedWorkers++;
			}
		});
		worker?.send('SHUTDOWN');
	}
	while (exitedWorkers < activeWorkers.length) {
		logger.info(
			context,
			`exitedWorkers: ${exitedWorkers} of ${activeWorkers.length}`,
		);
		await new Promise((r) => setTimeout(r, 100));
	}
	logger.info(
		context,
		`All workers exited. exitedWorkers: ${exitedWorkers} of ${activeWorkers.length}`,
	);
};

const startDate = new Date();
const run = async () => {
	if (cluster.isPrimary) {
		const context = {
			id: `${baseLogId}-primary`,
		};

		// Note that supervisor doesn't send a USR1 in handover mode; if the container doesn't shutdown itself before the timeout the supervisor sends a SIGTERM
		process.on('SIGUSR1', () => {
			console.log('Received SIGUSR1. Shutting down gracefully.');
			shutdownGracefully(context);
		});

		process.on('SIGTERM', () => {
			console.log('Received SIGTERM. Shutting down now.');
			// Default behavior: exiting with code 128 + signal number.
			process.exit(128 + 15);
		});

		const handoverPeer = new HandoverPeer(startDate, context);
		const handoverStatus = createHandoverStatus();

		logger.info(
			context,
			`Primary worker started, spawning ${numCPUs} workers.`,
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
					handoverStatus.startBroadcastingServiceUp();
				}
			} else if (message?.msg === 'DONE') {
				// Ignored, is handled by the shutdown code
			} else {
				logger.warn(context, `Unknown message received from worker`, message);
			}
		});

		// handoverPeer will call this function when we're shutting down.
		const shutdownCallback = async () => {
			handoverStatus.startBroadcastingServiceDown();
			await new Promise((r) => setTimeout(r, SHUTDOWN_GRACE_PERIOD));
			await shutdownGracefully(context);
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
							setTimeout(() => cluster.worker?.kill(), 10);
						}
					});

					if (timeToStart > 10000) {
						logger.warn(context, 'Slow server startup time', {
							time: timeToStart,
						});
					}
				})
				.catch((error) => {
					const message = 'Error on catch of bootstrap';
					if (_.isError(error)) {
						logger.exception(context, message, error);
					} else {
						logger.error(context, message, error);
					}
					process.exit(1);
				});
		} catch (error) {
			onError(error);
		}
	}
};

run();

function getIPv4InterfaceInfo(iface?: string): os.NetworkInterfaceInfo[] {
	return Object.entries(os.networkInterfaces())
		.filter(([nic]) => !iface || nic === iface)
		.flatMap(([, ips]) => ips || [])
		.filter((ip) => !ip.internal && ip.family === 'IPv4');
}

function createHandoverStatus(): HandoverStatus {
	const timestamp = new Date();
	const serviceName = process.env.BALENA_SERVICE_NAME || 'api';

	const ipV4Addresses: string[] = ([] as os.NetworkInterfaceInfo[])
		.concat(getIPv4InterfaceInfo('eth0'), getIPv4InterfaceInfo('eth1'))
		.map((nif) => nif.address);
	const addresses = ipV4Addresses;
	const handoverStatus = new HandoverStatus(timestamp, serviceName, addresses);
	return handoverStatus;
}
