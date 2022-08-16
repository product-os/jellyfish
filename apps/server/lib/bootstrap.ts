import * as assert from '@balena/jellyfish-assert';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import * as metrics from '@balena/jellyfish-metrics';
import { ActionRequestContract, Worker } from '@balena/jellyfish-worker';
import { strict } from 'assert';
import { Cache, errors as autumndbErrors, Kernel } from 'autumndb';
import _ from 'lodash';
import { setTimeout } from 'timers/promises';
import { createServer } from './http';
import { attachSocket } from './socket';

const logger = getLogger(__filename);

// TS-TODO: Define type for options argument
export const bootstrap = async (logContext: LogContext, options: any) => {
	logger.info(logContext, 'Configuring HTTP server');
	const webServer = createServer(logContext, {
		port: environment.http.port,
	});
	logger.info(logContext, 'Starting web server listener');
	// Start the webserver so that liveness and readiness endpoints can begin
	// serving traffic.
	// Note that the webserver is triggered as ready below ( see call to `webServer.ready` ),
	// where routes are defined,
	// so after the following call only a connect check would work
	await webServer.start();

	logger.info(logContext, 'Setting up cache');
	const cache = new Cache(environment.redis);
	if (cache) {
		await cache.connect();
	}

	// Instantiate an autumndb instance that will handle DB operations
	const backendOptions =
		options && options.database
			? Object.assign({}, environment.database.options, options.database)
			: environment.database.options;

	const { kernel, pool } = await Kernel.withPostgres(
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
		pool,
		options.plugins,
	);

	await worker.initialize(logContext, async (actionRequest) => {
		metrics.markActionRequest(actionRequest.data.action.split('@')[0]);
		try {
			// Get the actor by id
			if (!actionRequest.data.actor) {
				console.log('No actor found for action request', actionRequest);
			}
			const actor = await kernel.getContractById(
				logContext,
				kernel.adminSession()!,
				actionRequest.data.actor,
			);
			strict(actor, 'Actor not found');
			const requestData = actionRequest.data;
			requestData.context.worker = logContext.id;
			await worker.execute({ actor }, actionRequest);
		} catch (error: any) {
			logger.error(logContext, 'Failed to execute action request', {
				id: actionRequest.id,
				actor: actionRequest.data.actor!,
				error,
			});
		}
	});

	const closeWorker = async () => {
		await worker.stop();
		try {
			await kernel.disconnect(logContext);
		} catch (error) {
			logger.warn(logContext, `Error when disconnecting the kernel`, { error });
		}
		if (cache) {
			try {
				await cache.disconnect();
			} catch (error) {
				logger.warn(logContext, `Error when disconnecting the cache`, {
					error,
				});
			}
		}
	};

	// Need test user during development and CI.
	if (!environment.isProduction() || environment.isCI()) {
		logger.info(logContext, 'Inserting test user', {
			username: environment.test.user.username,
			role: environment.test.user.role,
		});

		assert.INTERNAL(
			logContext,
			environment.test.user.username,
			autumndbErrors.JellyfishInvalidEnvironmentVariable as any,
			`No test username: ${environment.test.user.username}`,
		);

		assert.INTERNAL(
			logContext,
			environment.test.user.role,
			autumndbErrors.JellyfishInvalidEnvironmentVariable as any,
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
					roles: [environment.test.user.role, 'user-operator'],
				},
			},
		);

		logger.info(logContext, 'Setting test user password', {
			username: environment.test.user.username,
			role: environment.test.user.role,
		});

		assert.INTERNAL(
			logContext,
			userContract,
			autumndbErrors.JellyfishNoElement,
			`Test user does not exist: ${environment.test.user.username}`,
		);

		const preResults = await worker.pre(kernel.adminSession()!, {
			action: 'action-set-password@1.0.0',
			logContext,
			card: userContract.id,
			type: userContract.type,
			arguments: {
				currentPassword: null,
				newPassword: environment.test.user.password,
			},
		});

		const actionRequestDate = new Date();
		await worker.insertCard<ActionRequestContract>(
			logContext,
			kernel.adminSession()!,
			worker.typeContracts['action-request@1.0.0'],
			{
				timestamp: new Date().toISOString(),
				actor: kernel.adminSession()?.actor.id,
			},
			{
				type: 'action-request@1.0.0',
				data: {
					...preResults,
					context: logContext,
					epoch: actionRequestDate.valueOf(),
					timestamp: actionRequestDate.toISOString(),
					actor: kernel.adminSession()?.actor.id,
					input: {
						id: userContract.id,
					},
				},
			},
		);

		const orgContract = await kernel.getContractBySlug(
			logContext,
			kernel.adminSession()!,
			`org-${environment.test.user.organization}@latest`,
		);

		assert.INTERNAL(
			logContext,
			orgContract,
			autumndbErrors.JellyfishNoElement,
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

	logger.info(logContext, 'Starting web server routes');
	// Set up routes/middlewares now that we're ready to serve http traffic
	webServer.ready(kernel, worker, {
		sync: worker.sync,
	});

	await worker.replaceCard(
		logContext,
		kernel.adminSession()!,
		worker.typeContracts['type@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			slug: 'flowdock-message',
			type: 'type@1.0.0',
			name: 'Flowdock message',
			markers: [],
			data: {
				schema: {
					required: ['data'],
					type: 'object',
					properties: {
						data: {
							required: [
								'username',
								'userFullName',
								'flowdockUserId',
								'flowdockUUID',
								'sent',
							],
							type: 'object',
							properties: {
								flowdockUUID: {
									type: 'string',
								},
								flowdockUserId: {
									type: 'string',
								},
								userFullName: {
									type: 'string',
								},
								username: {
									type: 'string',
								},
								content: {
									type: 'string',
									format: 'markdown',
									fullTextSearch: true,
								},
								sent: {
									type: 'string',
									format: 'date-time',
								},
								file: {
									type: 'object',
									properties: {
										name: {
											type: 'string',
										},
										mime: {
											type: 'string',
										},
										bytesize: {
											type: 'number',
										},
										slug: {
											type: 'string',
										},
									},
								},
							},
						},
					},
				},
				indexed_fields: [['data.content']],
			},
		},
	);

	await worker.replaceCard(
		logContext,
		kernel.adminSession()!,
		worker.typeContracts['type@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			slug: 'flowdock-archive',
			type: 'type@1.0.0',
			name: 'Flowdock archive',
			markers: [],
			data: {
				schema: {
					required: ['data'],
					type: 'object',
					properties: {
						data: {
							required: ['title', 'flowdockThreadId', 'flowdockFlow'],
							type: 'object',
							properties: {
								title: {
									type: 'string',
								},
								flowdockThreadId: {
									type: 'string',
								},
								flowdockFlow: {
									type: 'string',
								},
							},
						},
					},
				},
				indexed_fields: [['data.flowdockThreadId']],
			},
		},
	);

	await worker.replaceCard(
		logContext,
		kernel.adminSession()!,
		worker.typeContracts['relationship@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			slug: 'relationship-flowdock-message-is-attached-to-flowdock-archive',
			type: 'relationship@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				title: 'Flowdock message',
				inverseTitle: 'Flowdock archive',
				from: {
					type: 'flowdock-message',
				},
				to: {
					type: 'flowdock-archive',
				},
			},
		},
	);

	// TODO: Find out where this race condition is happening
	// Wait for the server to settle before starting
	await setTimeout(2000);

	return {
		worker,
		kernel,
		port: webServer.port,
		close: async () => {
			socketServer.close();
			metricsServer.close();
			await webServer.stop();
			await closeWorker();
		},
	};
};
