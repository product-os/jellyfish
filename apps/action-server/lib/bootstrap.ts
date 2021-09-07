/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { strict as nativeAssert } from 'assert';
import _ from 'lodash';
import { getLogger } from '@balena/jellyfish-logger';
import { Worker } from '@balena/jellyfish-worker';
import { Producer, Consumer } from '@balena/jellyfish-queue';
import { Sync } from '@balena/jellyfish-sync';
import { MemoryCache, create } from '@balena/jellyfish-core';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import * as metrics from '@balena/jellyfish-metrics';
import { http } from './http';
import { getPluginManager } from './plugins';
import { core, JSONSchema } from '@balena/jellyfish-types';
import { TriggeredActionContract } from '@balena/jellyfish-types/build/worker';
import {
	ActionRequestContract,
	SessionContract,
	SessionData,
	StreamChange,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { PluginManager } from '@balena/jellyfish-plugin-base';
import { Transformer } from '@balena/jellyfish-worker/build/transformers';

const logger = getLogger(__filename);

// A session with a guaranteed actor set
interface SessionContractWithActor extends SessionContract {
	data: SessionContract['data'] & {
		actor: string;
	};
}

const getActorKey = async (
	context: core.Context,
	jellyfish: core.JellyfishKernel,
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

interface BootstrapOptions {
	// Common options
	enablePriorityBuffer: boolean;
	port: number;
	metricsPort: number;
	pluginManager: PluginManager;
	onError: (context: core.Context, error: Error) => void;

	// Worker options
	onActionRequest?: (
		context: core.Context,
		jellyfish: core.JellyfishKernel,
		worker: Worker,
		queue: Consumer,
		session: string,
		actionRequest: ActionRequestContract,
		errorHandler: (error: Error) => void,
	) => Promise<void>;
	database?: string;
}

const bootstrap = async (context: core.Context, options: BootstrapOptions) => {
	const metricsServer = metrics.startServer(context, options.metricsPort);
	metrics.markQueueConcurrency();

	logger.info(context, 'Configuring HTTP server');

	const webServer = await http({
		port: options.port,
	});
	logger.info(context, 'Starting web server');

	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic
	await webServer.start();

	logger.info(context, 'Loading plugin actions');
	const actionLibrary = options.pluginManager.getActions(context);

	logger.info(context, 'Setting up cache');
	const cache = new MemoryCache(environment.redis);
	if (cache) {
		await cache.connect();
	}

	logger.info(context, 'Instantiating core library');
	const backendOptions = options.database
		? Object.assign({}, environment.database.options, options.database)
		: environment.database.options;
	const jellyfish = await create(context, cache, {
		backend: backendOptions,
	});

	const session = jellyfish.sessions!.admin;
	const consumer = new Consumer(
		// TS-TODO: Reconcile core.JellyfishKernel with Kernel
		jellyfish as any as core.JellyfishKernel,
		session,
	);
	const producer = new Producer(
		// TS-TODO: Reconcile core.JellyfishKernel with Kernel
		jellyfish as any as core.JellyfishKernel,
		session,
	);

	const integrations = options.pluginManager.getSyncIntegrations(context);

	context.sync = new Sync({
		// TS-TODO: This type cast should not be needed once the plugin base integration types are corrected
		integrations: integrations as any,
	});

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	const worker = new Worker(
		jellyfish,
		session,
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

	const workerContractsStream = await jellyfish.stream(
		context,
		session,
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
	const errorHandler = (error: Error) => {
		closeWorker()
			.then(() => {
				errorFunction(error);
			})
			.catch(errorFunction);
	};

	workerContractsStream.once('error', errorHandler);

	// On a stream event, update the stored contracts in the worker
	workerContractsStream.on('data', (data: StreamChange) => {
		const contractType = (
			data.after ? data.after.type : data.before.type
		).split('@')[0];
		if (
			data.type === 'update' ||
			data.type === 'insert' ||
			data.type === 'unmatch'
		) {
			// If `after` is null, the card is no longer available: most likely it has
			// been soft-deleted, having its `active` state set to false
			if (data.after === null) {
				switch (contractType) {
					case 'triggered-action':
						worker.removeTrigger(context, data.id);
						break;
					case 'transformer':
						worker.removeTransformer(context, data.id);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== data.id;
						});
						worker.setTypeContracts(context, filteredContracts);
				}
			} else {
				switch (contractType) {
					case 'triggered-action':
						worker.upsertTrigger(context, data.after);
						break;
					case 'transformer':
						worker.upsertTransformer(context, data.after as Transformer);
						break;
					case 'type':
						const filteredContracts = _.filter(worker.typeContracts, (type) => {
							return type.id !== data.id;
						});
						filteredContracts.push(data.after as TypeContract);
						worker.setTypeContracts(context, filteredContracts);
				}
			}
		}

		if (data.type === 'delete') {
			switch (contractType) {
				case 'triggered-action':
					worker.removeTrigger(context, data.id);
					break;
				case 'transformer':
					worker.removeTransformer(context, data.id);
					break;
				case 'type':
					const filteredContracts = _.filter(worker.typeContracts, (type) => {
						return type.id !== data.id;
					});
					worker.setTypeContracts(context, filteredContracts);
			}
		}
	});

	const workerContracts = await jellyfish.query<TriggeredActionContract>(
		context,
		session,
		workerContractsSchema,
	);

	const contractsMap = _.groupBy(workerContracts, (contract) => {
		return contract.type.split('@')[0];
	});

	const triggers = contractsMap['triggered-action'] || [];

	logger.info(context, 'Loading triggers', {
		triggers: triggers.length,
	});

	worker.setTriggers(context, triggers);

	const transformers = (contractsMap['transformer'] || []) as Transformer[];

	logger.info(context, 'Loading transformers', {
		transformers: transformers.length,
	});

	worker.setTransformers(context, transformers);

	const typeContracts = contractsMap['type'] || [];

	worker.setTypeContracts(context, typeContracts as TypeContract[]);

	await consumer.initializeWithEventHandler(context, async (actionRequest) => {
		nativeAssert(
			!!options.onActionRequest,
			'onActionRequest option must be provided when bootstrapping as the worker',
		);
		await options.onActionRequest(
			context,
			jellyfish as any as core.JellyfishKernel,
			worker,
			consumer,
			session,
			actionRequest,
			errorHandler,
		);
	});

	// Signal that this instance has started
	webServer.started();

	return {
		jellyfish,
		worker,
		consumer,
		producer,
		stop: async () => {
			await webServer.stop();
			await closeWorker();
			metricsServer.close();
		},
	};
};

export const bootstrapWorker = async (
	context: core.Context,
	options: any,
): Promise<any> => {
	return bootstrap(context, {
		enablePriorityBuffer: true,
		onError: options.onError,
		metricsPort: options.metricsPort,
		onActionRequest: async (
			serverContext,
			jellyfish,
			worker,
			_queue,
			session,
			actionRequest,
			errorHandler,
		) => {
			metrics.markActionRequest(actionRequest.data.action.split('@')[0]);
			try {
				const key = await getActorKey(
					serverContext,
					jellyfish,
					session,
					actionRequest.data.actor!,
				);
				// TS-TODO: This shouldn't require a type cast to any
				const requestData = actionRequest.data as any;
				requestData.context.worker = serverContext.id;
				await worker.execute(key.id, actionRequest);
			} catch (error: any) {
				errorHandler(error);
			}
		},
		database: options.database,
		pluginManager: getPluginManager(context),
		port: environment.http.workerPort,
	});
};
