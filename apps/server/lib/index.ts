/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { v4 as uuidv4 } from 'uuid';
import { getPluginManager } from './plugins';
import { bootstrap } from './bootstrap';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../package.json');

const logger = getLogger(__filename);

const DEFAULT_CONTEXT = {
	id: `SERVER-ERROR-${environment.pod.name}-${packageJSON.version}`,
};

const onError = (error, message = 'Server error', ctx = DEFAULT_CONTEXT) => {
	logger.exception(ctx, message, error);
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

const id = uuidv4();
const context = {
	id: `SERVER-${packageJSON.version}-${environment.pod.name}-${id}`,
};

const startDate = new Date();
logger.info(context, 'Starting server', {
	time: startDate.getTime(),
});

try {
	const options = {
		pluginManager: getPluginManager(context),
	};

	bootstrap(context, options)
		.then((server) => {
			const endDate = new Date();
			const timeToStart = endDate.getTime() - startDate.getTime();

			logger.info(context, 'Server started', {
				time: timeToStart,
				port: server.port,
			});

			if (timeToStart > 10000) {
				logger.warn(context, 'Slow server startup time', {
					time: timeToStart,
				});
			}
		})
		.catch((error) => {
			logger.exception(context, 'Server error', error);
			process.exit(1);
		});
} catch (error) {
	onError(error);
}
