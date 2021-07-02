/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getLogger } from '@balena/jellyfish-logger';
import { core } from '@balena/jellyfish-types';
import { v4 as uuidv4 } from 'uuid';
import { bootstrapTick } from './bootstrap';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../package.json');

const logger = getLogger(__filename);

const DEFAULT_ERROR_CONTEXT: core.Context = {
	id: `TICK-ERROR-${packageJSON.version}`,
};

const onError = (
	serverContext: core.Context,
	error: Error,
	message: string = 'Tick worker error',
): void => {
	logger.exception(serverContext, message, error);
	setTimeout(() => {
		process.exit(1);
	}, 1000);
};

process.on('unhandledRejection', (error: Error): void => {
	return onError(DEFAULT_ERROR_CONTEXT, error, 'Unhandled Tick Error');
});

const startDate = new Date();
const id = uuidv4();
const context: core.Context = {
	id: `TICK-${packageJSON.version}-${id}`,
};

logger.info(context, 'Starting tick worker', {
	time: startDate.getTime(),
});

try {
	bootstrapTick(context, {
		onError: (serverContext, error) => {
			return onError(serverContext, error);
		},
	})
		.then((server) => {
			process.once('SIGINT', async () => {
				await server.stop();
			});
			process.once('SIGTERM', async () => {
				await server.stop();
			});

			const endDate = new Date();
			const timeToStart = endDate.getTime() - startDate.getTime();

			logger.info(context, 'Tick worker started', {
				time: timeToStart,
			});
		})
		.catch((error: Error) => {
			return onError(context, error);
		});
} catch (error: any) {
	onError(DEFAULT_ERROR_CONTEXT, error);
}
