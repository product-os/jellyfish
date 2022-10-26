import { getLogger } from '@balena/jellyfish-logger';
import process from 'node:process';
import { HandoverPeer } from 'handover-lib';
import { HandoverStatus, HandoverStatusMessage } from 'handover-lib';
import _ from 'lodash';
import { handleStatusMessage } from './handover';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../package.json');

// Logging
const logger = getLogger(__filename);
const serverId = Math.round(Math.random() * 1000);
const baseLogId = `SERVER-ID-${serverId}-V-${packageJSON.version}`;
const DEFAULT_CONTEXT = {
	id: `ERROR-${baseLogId}`,
};

const context = {
	id: `${baseLogId}`,
};

function setupErrorAndProcessHandling() {
	// Error and process handling
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

	// Note that supervisor doesn't send a USR1 in handover mode; if the container doesn't shutdown itself before the timeout the supervisor sends a SIGTERM
	process.on('SIGUSR1', () => {
		logger.info(context, 'Received SIGUSR1. Shutting down gracefully.');
		process.exit(128 + 10);
	});

	process.on('SIGTERM', () => {
		logger.info(context, 'Received SIGTERM. Shutting down now.');
		// Default behavior: exiting with code 128 + signal number.
		process.exit(128 + 15);
	});
}

setupErrorAndProcessHandling();

async function run() {
	// handoverPeer is for the handover of the service itself
	const startDate = new Date();
	const handoverPeer = new HandoverPeer(startDate, context);
	handoverPeer.startListening(async () => {
		logger.info(context, 'shutting down');
	});

	// handoverStatus for handling the services updates
	const timestamp = new Date();
	// This is our service name, which will be different than the one defined on the status messages
	const serviceName =
		process.env.BALENA_SERVICE_NAME || 'haproxy-handover-helper';
	const handoverStatus = new HandoverStatus(timestamp, serviceName, []);
	handoverStatus.startListening((message: HandoverStatusMessage) =>
		handleStatusMessage(message, context),
	);
}

run();
