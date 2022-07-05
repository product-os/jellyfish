import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import { v4 as uuidv4 } from 'uuid';
import { bootstrap } from './bootstrap';
import { getPlugins } from './plugins';
import cluster from 'node:cluster';
import { cpus } from 'node:os';
import process from 'node:process';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../package.json');

const logger = getLogger(__filename);

let numCPUs = cpus().length;

const MAX_WORKERS = process.env.MAX_WORKERS;
if (MAX_WORKERS) {
	numCPUs = Math.min(numCPUs, parseInt(MAX_WORKERS, 10));
}

const DEFAULT_CONTEXT = {
	id: `SERVER-ERROR-${environment.pod.name}-${packageJSON.version}`,
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

process.on('unhandledRejection', (error) => {
	return onError(error, 'Unhandled Server Error');
});

const startDate = new Date();

const run = async () => {
	if (cluster.isPrimary) {
		logger.info(
			DEFAULT_CONTEXT,
			`Primary worker started, spawning ${numCPUs} workers`,
			{
				time: startDate.getTime(),
			},
		);

		// Fork workers.
		for (let i = 0; i < numCPUs; i++) {
			cluster.fork();
		}

		cluster.on('exit', (worker, code, signal) => {
			logger.info(DEFAULT_CONTEXT, `worker ${worker.process.pid} died`, {
				code,
				signal,
			});
		});
	} else {
		const id = uuidv4();
		const context = {
			id: `SERVER-${packageJSON.version}-${environment.pod.name}-worker#${cluster.worker?.id}-${id}`,
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
