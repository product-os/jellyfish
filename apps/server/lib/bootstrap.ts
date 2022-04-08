import * as assert from '@balena/jellyfish-assert';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import * as metrics from '@balena/jellyfish-metrics';
import type { JsonSchema } from '@balena/jellyfish-types';
import type { SessionContract } from '@balena/jellyfish-types/build/core';
import {
	errors as workerErrors,
	Sync,
	Transformer,
	Worker,
} from '@balena/jellyfish-worker';
import * as autumndb from 'autumndb';
import _ from 'lodash';
import { loadContracts } from './contract-loader';
import { createServer } from './http';
import { attachSocket } from './socket';

const logger = getLogger(__filename);

// A session with a guaranteed actor set
interface SessionContractWithActor extends SessionContract {
	data: SessionContract['data'] & {
		actor: string;
	};
}

const SCHEMA_ACTIVE_TRANSFORMERS: JsonSchema = {
	type: 'object',
	required: ['active', 'type', 'data', 'version'],
	properties: {
		active: {
			const: true,
		},
		type: {
			const: 'transformer@1.0.0',
		},
		// ignoring draft versions
		version: { not: { pattern: '-' } },
		data: {
			type: 'object',
			required: ['$transformer'],
			properties: {
				$transformer: {
					type: 'object',
					required: ['artifactReady'],
					properties: {
						artifactReady: {
							not: {
								const: false,
							},
						},
					},
				},
			},
		},
	},
};

const getActorKey = async (
	logContext: LogContext,
	kernel: autumndb.Kernel,
	session: string,
	actorId: string,
): Promise<SessionContractWithActor> => {
	const keySlug = `session-action-${actorId}`;
	const key = await kernel.getContractBySlug<SessionContract>(
		logContext,
		session,
		`${keySlug}@1.0.0`,
	);

	if (key && key.active && key.data.actor === actorId) {
		return key;
	}

	logger.info(logContext, 'Create worker key', {
		slug: keySlug,
		actor: actorId,
	});

	return kernel.replaceContract(
		logContext,
		session,
		autumndb.Kernel.defaults({
			slug: keySlug,
			active: true,
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: actorId,
			},
		}),
	);
};

// TS-TODO: Define type for options argument
export const bootstrap = async (logContext: LogContext, options: any) => {
	// Load plugin data
	const integrations = options.pluginManager.getSyncIntegrations(logContext);
	const actionLibrary = options.pluginManager.getActions(logContext);
	const contracts = options.pluginManager.getCards();

	logger.info(logContext, 'Configuring HTTP server');
	const webServer = createServer(logContext, {
		port: environment.http.port,
	});
	logger.info(logContext, 'Starting web server');
	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start();

	logger.info(logContext, 'Setting up cache');
	const cache = new autumndb.Cache(environment.redis);
	if (cache) {
		await cache.connect();
	}

	// Instantiate an autumndb instance that will handle DB operations
	const backendOptions =
		options && options.database
			? Object.assign({}, environment.database.options, options.database)
			: environment.database.options;

	const { kernel, pool } = await autumndb.Kernel.withPostgres(
		logContext,
		cache,
		backendOptions,
	);

	const metricsServer = metrics.startServer(
		logContext,
		environment.metrics.ports.app,
	);

	// Create and initialize the worker instance. This will process jobs from the queue.
	const worker = new Worker(
		kernel,
		kernel.adminSession()!,
		actionLibrary,
		pool,
	);

	// Set up a sync instance using integrations from plugins
	const sync = new Sync({
		integrations,
	});

	await worker.initialize(logContext, sync, async (actionRequest) => {
		metrics.markActionRequest(actionRequest.data.action.split('@')[0]);
		try {
			const key = await getActorKey(
				logContext,
				kernel,
				kernel.adminSession()!,
				actionRequest.data.actor!,
			);
			const requestData = actionRequest.data;
			requestData.context.worker = logContext.id;
			await worker.execute(key.id, actionRequest);
		} catch (error: any) {
			errorHandler(error);
		}
	});

	// For better performance, commonly accessed contracts are stored in cache in the worker.
	// These contracts are streamed from the DB, so the worker always has the most up to date version of them.
	const workerContractsStream = await kernel.stream(
		logContext,
		kernel.adminSession()!,
		{
			anyOf: [SCHEMA_ACTIVE_TRANSFORMERS],
		},
	);

	const closeWorker = async () => {
		await worker.consumer.cancel();
		workerContractsStream.removeAllListeners();
		workerContractsStream.close();
		await kernel.disconnect(logContext);
		if (cache) {
			await cache.disconnect();
		}
	};

	const errorFunction = _.partial(options.onError, logContext);

	// TODO: Should the worker crash if an exception is raised from executing a task or a stream error?
	const errorHandler = (error: Error) => {
		closeWorker()
			.then(() => {
				errorFunction(error);
			})
			.catch(errorFunction);
	};

	workerContractsStream.once('error', errorHandler);

	// On a stream event, update the stored contracts in the worker
	workerContractsStream.on('data', (change: autumndb.StreamChange) => {
		const contract = change.after;
		if (
			change.type === 'update' ||
			change.type === 'insert' ||
			change.type === 'unmatch'
		) {
			// If `after` is null, the contract is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (!contract) {
				worker.removeTransformer(logContext, change.id);
			} else {
				worker.upsertTransformer(logContext, contract as Transformer);
			}
		} else if (change.type === 'delete') {
			worker.removeTransformer(logContext, change.id);
		}
	});

	const transformers = await kernel.query(
		logContext,
		kernel.adminSession()!,
		SCHEMA_ACTIVE_TRANSFORMERS,
	);
	logger.info(logContext, 'Loading transformers', {
		transformers: transformers.length,
	});
	worker.setTransformers(logContext, transformers as Transformer[]);

	const results = await loadContracts(
		logContext,
		kernel,
		worker,
		kernel.adminSession()!,
		contracts,
	);

	logger.info(logContext, 'Inserting test user', {
		username: environment.test.user.username,
		role: environment.test.user.role,
	});

	assert.INTERNAL(
		logContext,
		environment.test.user.username,
		autumndb.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test username: ${environment.test.user.username}`,
	);

	assert.INTERNAL(
		logContext,
		environment.test.user.role,
		autumndb.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test role: ${environment.test.user.role}`,
	);

	const userContract = await kernel.replaceContract(
		logContext,
		kernel.adminSession()!,
		{
			slug: `user-${environment.test.user.username}`,
			type: 'user@1.0.0',
			name: 'Test User',
			data: {
				email: 'test@jel.ly.fish',
				hash: 'PASSWORDLESS',
				roles: [environment.test.user.role],
			},
		},
	);

	// Need test user during development and CI.
	if (!environment.isProduction() || environment.isCI()) {
		logger.info(logContext, 'Setting test user password', {
			username: environment.test.user.username,
			role: environment.test.user.role,
		});

		assert.INTERNAL(
			logContext,
			userContract,
			autumndb.errors.JellyfishNoElement,
			`Test user does not exist: ${environment.test.user.username}`,
		);

		const requestOptions = await worker.pre(kernel.adminSession()!, {
			action: 'action-set-password@1.0.0',
			logContext,
			card: userContract.id,
			type: userContract.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password,
			},
		});

		const request = await worker.producer.storeRequest(
			worker.getId(),
			kernel.adminSession()!,
			requestOptions,
		);
		const result = await worker.execute(kernel.adminSession()!, request);
		assert.INTERNAL(
			logContext,
			!result.error,
			workerErrors.WorkerAuthenticationError,
			`Could not set test password for ${environment.test.user.username}`,
		);

		const orgContract = await kernel.getContractBySlug(
			logContext,
			kernel.adminSession()!,
			`org-${environment.test.user.organization}@latest`,
		);

		assert.INTERNAL(
			logContext,
			orgContract,
			autumndb.errors.JellyfishNoElement,
			`Test org does not exist: ${environment.test.user.organization}`,
		);

		await kernel.replaceContract(logContext, kernel.adminSession()!, {
			type: 'link@1.0.0',
			name: 'has member',
			slug: `link-${orgContract!.id}-has-member-${userContract.id}`,
			data: {
				inverseName: 'is member of',
				from: {
					id: orgContract!.id,
					type: orgContract!.type,
				},
				to: {
					id: userContract.id,
					type: userContract.type,
				},
			},
		});
	}

	logger.info(logContext, 'Configuring socket server');
	const socketServer = attachSocket(kernel, webServer.server);

	// Finish setting up routes and middlewares now that we are ready to serve
	// http traffic
	webServer.ready(kernel, worker, {
		guestSession: results.guestSession.id,
		sync,
	});

	// Manually bootstrap channels
	// TODO: This should ideally be completely automated, but this would
	// require that triggered actions are up and running before any
	// channel contracts are loaded.
	const channels = _.filter(contracts, {
		type: 'channel@1.0.0',
		active: true,
	});

	logger.info(
		logContext,
		`Bootstrapping ${channels.length} channel${
			channels.length === 1 ? '' : 's'
		}`,
	);

	await Promise.all(
		channels.map(async (channel) => {
			const channelContract = await kernel.getContractBySlug(
				logContext,
				kernel.adminSession()!,
				`${channel.slug}@${channel.version}`,
			);
			return worker.producer.enqueue(worker.getId(), kernel.adminSession()!, {
				action: 'action-bootstrap-channel@1.0.0',
				logContext,
				card: channelContract!.id,
				type: channelContract!.type,
				arguments: {},
			});
		}),
	);

	return {
		worker,
		kernel,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			socketServer.close();
			metricsServer.close();
			await webServer.stop();
			await closeWorker();
			await kernel.disconnect(logContext);
			if (cache) {
				await cache.disconnect();
			}
		},
	};
};
