import _ from 'lodash';
import * as core from '@balena/jellyfish-core';
import { Producer, Consumer } from '@balena/jellyfish-queue';
import {
	Sync,
	Transformer,
	TriggeredActionContract,
	Worker,
	errors as workerErrors,
} from '@balena/jellyfish-worker';
import * as assert from '@balena/jellyfish-assert';
import * as metrics from '@balena/jellyfish-metrics';
import { loadCards } from './card-loader';
import { createServer } from './http';
import { attachSocket } from './socket';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	SessionContract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';

const logger = getLogger(__filename);

// A session with a guaranteed actor set
interface SessionContractWithActor extends SessionContract {
	data: SessionContract['data'] & {
		actor: string;
	};
}

const SCHEMA_ACTIVE_TRIGGERS: JsonSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
		},
		slug: {
			type: 'string',
		},
		active: {
			type: 'boolean',
			const: true,
		},
		type: {
			type: 'string',
			const: 'triggered-action@1.0.0',
		},
		data: {
			type: 'object',
			additionalProperties: true,
		},
	},
	required: ['id', 'slug', 'active', 'type', 'data'],
};

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

const SCHEMA_ACTIVE_TYPE_CONTRACTS: JsonSchema = {
	type: 'object',
	required: ['active', 'type'],
	properties: {
		active: {
			const: true,
		},
		type: {
			const: 'type@1.0.0',
		},
	},
};

const getActorKey = async (
	logContext: LogContext,
	kernel: core.Kernel,
	session: string,
	actorId: string,
): Promise<SessionContractWithActor> => {
	const keySlug = `session-action-${actorId}`;
	const key = await kernel.getCardBySlug<SessionContract>(
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
		core.Kernel.defaults({
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

export const bootstrap = async (logContext: LogContext, options) => {
	// Load plugin data
	const integrations = options.pluginManager.getSyncIntegrations(logContext);
	const actionLibrary = options.pluginManager.getActions(logContext);
	const cards = options.pluginManager.getCards(logContext, core.cardMixins);

	logger.info(logContext, 'Configuring HTTP server');
	const webServer = createServer(logContext, {
		port: environment.http.port,
	});
	logger.info(logContext, 'Starting web server');
	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start();

	logger.info(logContext, 'Setting up cache');
	const cache = new core.Cache(environment.redis);
	if (cache) {
		await cache.connect();
	}

	// Instantiate a core instance that will handle DB operations
	const backendOptions =
		options && options.database
			? Object.assign({}, environment.database.options, options.database)
			: environment.database.options;

	const { kernel, pool } = await core.Kernel.withPostgres(
		logContext,
		cache,
		backendOptions,
	);

	const metricsServer = metrics.startServer(
		logContext,
		environment.metrics.ports.app,
	);

	// Create queue instances
	const producer = new Producer(kernel, pool, kernel.adminSession()!);
	const consumer = new Consumer(kernel, pool, kernel.adminSession()!);
	await producer.initialize(logContext);
	await consumer.initializeWithEventHandler(
		logContext,
		async (actionRequest) => {
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
		},
	);

	// Create and initialize the worker instance. This will process jobs from the queue.
	const worker = new Worker(
		kernel as any,
		kernel.adminSession()!,
		actionLibrary,
		consumer,
		producer,
	);

	// Set up a sync instance using integrations from plugins
	const sync = new Sync({
		integrations,
	});

	await worker.initialize(logContext, sync);

	// For better performance, commonly accessed contracts are stored in cache in the worker.
	// These contracts are streamed from the DB, so the worker always has the most up to date version of them.
	const workerContractsStream = await kernel.stream(
		logContext,
		kernel.adminSession()!,
		{
			anyOf: [
				SCHEMA_ACTIVE_TRIGGERS,
				SCHEMA_ACTIVE_TRANSFORMERS,
				SCHEMA_ACTIVE_TYPE_CONTRACTS,
			],
		},
	);

	const closeWorker = async () => {
		await consumer.cancel();
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
	workerContractsStream.on('data', (change: core.StreamChange) => {
		const contract = change.after;
		const contractType = change.contractType.split('@')[0];
		if (
			change.type === 'update' ||
			change.type === 'insert' ||
			change.type === 'unmatch'
		) {
			// If `after` is null, the card is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (!contract) {
				switch (contractType) {
					case 'triggered-action':
						worker.removeTrigger(logContext, change.id);
						break;
					case 'transformer':
						worker.removeTransformer(logContext, change.id);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== change.id;
						});
						worker.setTypeContracts(logContext, filteredContracts);
				}
			} else {
				switch (contractType) {
					case 'triggered-action':
						worker.upsertTrigger(logContext, contract);
						break;
					case 'transformer':
						worker.upsertTransformer(logContext, contract as Transformer);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== change.id;
						});
						filteredContracts.push(contract as TypeContract);
						worker.setTypeContracts(logContext, filteredContracts);
				}
			}
		} else if (change.type === 'delete') {
			switch (contractType) {
				case 'triggered-action':
					worker.removeTrigger(logContext, change.id);
					break;
				case 'transformer':
					worker.removeTransformer(logContext, change.id);
					break;
				case 'type':
					const filteredContracts = _.filter(worker.typeContracts, (type) => {
						return type.id !== change.id;
					});
					worker.setTypeContracts(logContext, filteredContracts);
			}
		}
	});

	const [triggers, transformers, typeContracts] = await Promise.all(
		[
			SCHEMA_ACTIVE_TRIGGERS,
			SCHEMA_ACTIVE_TRANSFORMERS,
			SCHEMA_ACTIVE_TYPE_CONTRACTS,
		].map((schema) => kernel.query(logContext, kernel.adminSession()!, schema)),
	);

	logger.info(logContext, 'Loading triggers', {
		triggers: triggers.length,
	});
	worker.setTriggers(logContext, triggers as TriggeredActionContract[]);

	logger.info(logContext, 'Loading transformers', {
		transformers: transformers.length,
	});
	worker.setTransformers(logContext, transformers as Transformer[]);

	logger.info(logContext, 'Loading types', {
		transformers: transformers.length,
	});
	worker.setTypeContracts(logContext, typeContracts as TypeContract[]);

	const results = await loadCards(
		logContext,
		kernel,
		worker,
		kernel.adminSession()!,
		cards,
	);

	logger.info(logContext, 'Inserting test user', {
		username: environment.test.user.username,
		role: environment.test.user.role,
	});

	assert.INTERNAL(
		logContext,
		environment.test.user.username,
		core.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test username: ${environment.test.user.username}`,
	);

	assert.INTERNAL(
		logContext,
		environment.test.user.role,
		core.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test role: ${environment.test.user.role}`,
	);

	const userCard = await kernel.replaceCard(
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
			userCard,
			core.errors.JellyfishNoElement as any,
			`Test user does not exist: ${environment.test.user.username}`,
		);

		const requestOptions = await worker.pre(kernel.adminSession()!, {
			action: 'action-set-password@1.0.0',
			logContext,
			card: userCard.id,
			type: userCard.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password,
			},
		});

		const request = await producer.storeRequest(
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

		const orgCard = await kernel.getCardBySlug(
			logContext,
			kernel.adminSession()!,
			`org-${environment.test.user.organization}@latest`,
		);

		assert.INTERNAL(
			logContext,
			orgCard,
			core.errors.JellyfishNoElement as any,
			`Test org does not exist: ${environment.test.user.organization}`,
		);

		await kernel.replaceCard(logContext, kernel.adminSession()!, {
			type: 'link@1.0.0',
			name: 'has member',
			slug: `link-${orgCard!.id}-has-member-${userCard.id}`,
			data: {
				inverseName: 'is member of',
				from: {
					id: orgCard!.id,
					type: orgCard!.type,
				},
				to: {
					id: userCard.id,
					type: userCard.type,
				},
			},
		});
	}

	logger.info(logContext, 'Configuring socket server');
	const socketServer = attachSocket(kernel, webServer.server);

	// Finish setting up routes and middlewares now that we are ready to serve
	// http traffic
	webServer.ready(kernel, worker, producer, {
		guestSession: results.guestSession.id,
		sync,
	});

	// Manually bootstrap channels
	// TODO: This should ideally be completely automated, but this would
	// require that triggered actions are up and running before any
	// channel cards are loaded.
	const channels = _.filter(cards, {
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
			const channelCard = await kernel.getCardBySlug(
				logContext,
				kernel.adminSession()!,
				`${channel.slug}@${channel.version}`,
			);
			return producer.enqueue(worker.getId(), kernel.adminSession()!, {
				action: 'action-bootstrap-channel@1.0.0',
				logContext,
				card: channelCard!.id,
				type: channelCard!.type,
				arguments: {},
			});
		}),
	);

	return {
		worker,
		kernel,
		producer,
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
