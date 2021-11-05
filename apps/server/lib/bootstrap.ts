import _ from 'lodash';
import * as core from '@balena/jellyfish-core';
import { Producer, Consumer } from '@balena/jellyfish-queue';
import { Worker } from '@balena/jellyfish-worker';
import { Sync } from '@balena/jellyfish-sync';
import * as assert from '@balena/jellyfish-assert';
import * as metrics from '@balena/jellyfish-metrics';
import { loadCards } from './card-loader';
import { createServer } from './http';
import { attachSocket } from './socket';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import type { core as coreType, JSONSchema } from '@balena/jellyfish-types';
import { TriggeredActionContract } from '@balena/jellyfish-types/build/worker';
import {
	Contract,
	SessionContract,
	SessionData,
	StreamChange,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { Transformer } from '@balena/jellyfish-worker/build/transformers';

const logger = getLogger(__filename);

// A session with a guaranteed actor set
interface SessionContractWithActor extends SessionContract {
	data: SessionContract['data'] & {
		actor: string;
	};
}

const SCHEMA_ACTIVE_TRIGGERS: JSONSchema = {
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

const SCHEMA_ACTIVE_TRANSFORMERS: JSONSchema = {
	type: 'object',
	required: ['active', 'type', 'data'],
	properties: {
		active: {
			const: true,
		},
		type: {
			const: 'transformer@1.0.0',
		},
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

const SCHEMA_ACTIVE_TYPE_CONTRACTS: JSONSchema = {
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
	context: coreType.Context,
	jellyfish: coreType.JellyfishKernel,
	session: string,
	actorId: string,
): Promise<SessionContractWithActor> => {
	const keySlug = `session-action-${actorId}`;
	const key = await jellyfish.getCardBySlug<SessionContract>(
		context,
		session,
		`${keySlug}@1.0.0`,
	);

	if (key && key.active && key.data.actor === actorId) {
		return key;
	}

	logger.info(context, 'Create worker key', {
		slug: keySlug,
		actor: actorId,
	});

	return jellyfish.replaceCard<SessionData>(
		context,
		session,
		jellyfish.defaults<SessionContract>({
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

export const bootstrap = async (context, options) => {
	// Load plugin data
	const integrations = options.pluginManager.getSyncIntegrations(context);
	const actionLibrary = options.pluginManager.getActions(context);
	const cards = options.pluginManager.getCards(context, core.cardMixins);

	// Set up a sync instance using integrations from plugins
	context.sync = new Sync({
		integrations,
	});

	logger.info(context, 'Configuring HTTP server');
	const webServer = await createServer(context, {
		port: environment.http.port,
	});
	logger.info(context, 'Starting web server');
	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start();

	logger.info(context, 'Setting up cache');
	const cache = new core.MemoryCache(environment.redis);
	if (cache) {
		await cache.connect();
	}

	// Instantiate a core instance that will handle DB operations
	const backendOptions =
		options && options.database
			? Object.assign({}, environment.database.options, options.database)
			: environment.database.options;
	const jellyfish = (await core.create(context, cache, {
		backend: backendOptions,
	})) as any as coreType.JellyfishKernel;

	const metricsServer = metrics.startServer(
		context,
		environment.metrics.ports.app,
	);

	// Create queue instances
	const producer = new Producer(jellyfish, jellyfish.sessions.admin);
	const consumer = new Consumer(jellyfish, jellyfish.sessions.admin);
	await producer.initialize(context);

	// Create and initialize the worker instance. This will process jobs from the queue.
	const worker = new Worker(
		jellyfish as any,
		jellyfish.sessions!.admin,
		actionLibrary,
		consumer,
		producer,
	);
	await worker.initialize(context);

	const workerContractsSchema = {
		anyOf: [
			SCHEMA_ACTIVE_TRIGGERS,
			SCHEMA_ACTIVE_TRANSFORMERS,
			SCHEMA_ACTIVE_TYPE_CONTRACTS,
		],
	};

	// For better performance, commonly accessed contracts are stored in cache in the worker.
	// These contracts are streamed from the DB, so the worker always has the most up to date version of them.
	const workerContractsStream = await jellyfish.stream(
		context,
		jellyfish.sessions!.admin,
		workerContractsSchema,
	);

	const closeWorker = async () => {
		await consumer.cancel();
		workerContractsStream.removeAllListeners();
		await workerContractsStream.close();
		await jellyfish.disconnect(context);
		if (cache) {
			await cache.disconnect();
		}
	};

	const errorFunction = _.partial(options.onError, context);

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
	workerContractsStream.on('data', (change: StreamChange) => {
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
						worker.removeTrigger(context, change.id);
						break;
					case 'transformer':
						worker.removeTransformer(context, change.id);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== change.id;
						});
						worker.setTypeContracts(context, filteredContracts);
				}
			} else {
				switch (contractType) {
					case 'triggered-action':
						worker.upsertTrigger(context, contract);
						break;
					case 'transformer':
						worker.upsertTransformer(context, contract as Transformer);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== change.id;
						});
						filteredContracts.push(contract as TypeContract);
						worker.setTypeContracts(context, filteredContracts);
				}
			}
		} else if (change.type === 'delete') {
			switch (contractType) {
				case 'triggered-action':
					worker.removeTrigger(context, change.id);
					break;
				case 'transformer':
					worker.removeTransformer(context, change.id);
					break;
				case 'type':
					const filteredContracts = _.filter(worker.typeContracts, (type) => {
						return type.id !== change.id;
					});
					worker.setTypeContracts(context, filteredContracts);
			}
		}
	});

	const workerContracts = await jellyfish.query<TriggeredActionContract>(
		context,
		jellyfish.sessions!.admin,
		workerContractsSchema,
	);

	const contractsMap = _.groupBy(workerContracts, (contract) => {
		return contract.type.split('@')[0];
	}) as _.Dictionary<[Contract<unknown>, ...Array<Contract<unknown>>]>;

	const triggers = contractsMap['triggered-action'] || [];

	logger.info(context, 'Loading triggers', {
		triggers: triggers.length,
	});

	worker.setTriggers(context, triggers as TriggeredActionContract[]);

	const transformers = (contractsMap['transformer'] || []) as Transformer[];

	logger.info(context, 'Loading transformers', {
		transformers: transformers.length,
	});

	worker.setTransformers(context, transformers);

	const typeContracts = contractsMap['type'] || [];

	worker.setTypeContracts(context, typeContracts as TypeContract[]);

	await consumer.initializeWithEventHandler(context, async (actionRequest) => {
		metrics.markActionRequest(actionRequest.data.action.split('@')[0]);
		try {
			const key = await getActorKey(
				context,
				jellyfish,
				jellyfish.sessions!.admin,
				actionRequest.data.actor!,
			);
			const requestData = actionRequest.data;
			requestData.context.worker = context.id;
			await worker.execute(key.id, actionRequest);
		} catch (error: any) {
			errorHandler(error);
		}
	});

	const results = await loadCards(
		context,
		jellyfish,
		worker,
		jellyfish.sessions!.admin,
		cards,
	);

	logger.info(context, 'Inserting test user', {
		username: environment.test.user.username,
		role: environment.test.user.role,
	});

	assert.INTERNAL(
		context,
		environment.test.user.username,
		jellyfish.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test username: ${environment.test.user.username}`,
	);

	assert.INTERNAL(
		context,
		environment.test.user.role,
		jellyfish.errors.JellyfishInvalidEnvironmentVariable as any,
		`No test role: ${environment.test.user.role}`,
	);

	const userCard = await jellyfish.replaceCard(
		context,
		jellyfish.sessions!.admin,
		{
			slug: `user-${environment.test.user.username}`,
			type: 'user@1.0.0',
			version: '1.0.0',
			requires: [],
			capabilities: [],
			name: 'Test User',
			markers: [],
			tags: [],
			links: {},
			active: true,
			data: {
				email: 'test@jel.ly.fish',
				hash: 'PASSWORDLESS',
				roles: [environment.test.user.role],
			},
		} as any,
	);

	// Need test user during development and CI.
	if (!environment.isProduction() || environment.isCI()) {
		logger.info(context, 'Setting test user password', {
			username: environment.test.user.username,
			role: environment.test.user.role,
		});

		assert.INTERNAL(
			context,
			userCard,
			jellyfish.errors.JellyfishNoElement as any,
			`Test user does not exist: ${environment.test.user.username}`,
		);

		const requestOptions = await worker.pre(jellyfish.sessions!.admin, {
			action: 'action-set-password@1.0.0',
			context,
			card: userCard.id,
			type: userCard.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password,
			},
		});

		const request = await producer.storeRequest(
			worker.getId(),
			jellyfish.sessions!.admin,
			requestOptions,
		);
		const result = await worker.execute(jellyfish.sessions!.admin, request);
		assert.INTERNAL(
			context,
			!result.error,
			worker.errors.WorkerAuthenticationError,
			`Could not set test password for ${environment.test.user.username}`,
		);

		const orgCard = await jellyfish.getCardBySlug(
			context,
			jellyfish.sessions!.admin,
			`org-${environment.test.user.organization}@latest`,
		);

		assert.INTERNAL(
			context,
			orgCard,
			jellyfish.errors.JellyfishNoElement as any,
			`Test org does not exist: ${environment.test.user.organization}`,
		);

		await jellyfish.replaceCard(context, jellyfish.sessions!.admin, {
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

	logger.info(context, 'Configuring socket server');
	const socketServer = attachSocket(jellyfish, webServer.server);

	// Finish setting up routes and middlewares now that we are ready to serve
	// http traffic
	await webServer.ready(jellyfish, worker, producer, {
		guestSession: results.guestSession.id,
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
		context,
		`Bootstrapping ${channels.length} channel${
			channels.length === 1 ? '' : 's'
		}`,
	);

	await Promise.all(
		channels.map(async (channel) => {
			const channelCard = await jellyfish.getCardBySlug(
				context,
				jellyfish.sessions!.admin,
				`${channel.slug}@${channel.version}`,
			);
			return producer.enqueue(worker.getId(), jellyfish.sessions!.admin, {
				action: 'action-bootstrap-channel@1.0.0',
				context,
				card: channelCard!.id,
				type: channelCard!.type,
				arguments: {},
			});
		}),
	);

	return {
		worker,
		jellyfish,
		producer,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			socketServer.close();
			metricsServer.close();
			await webServer.stop();
			await closeWorker();
			await jellyfish.disconnect(context);
			if (cache) {
				await cache.disconnect();
			}
		},
	};
};
