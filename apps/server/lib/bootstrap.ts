import * as assert from '@balena/jellyfish-assert';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import * as metrics from '@balena/jellyfish-metrics';
import type { SessionContract } from '@balena/jellyfish-types/build/core';
import { ActionRequestContract, Worker } from '@balena/jellyfish-worker';
import { strict } from 'assert';
import * as autumndb from 'autumndb';
import _ from 'lodash';
import { setTimeout } from 'timers/promises';
import { createServer } from './http';
import { attachSocket } from './socket';

const logger = getLogger(__filename);

// A session with a guaranteed actor set
interface SessionContractWithActor extends SessionContract {
	data: SessionContract['data'] & {
		actor: string;
	};
}

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
		pool,
		options.plugins,
	);

	await worker.initialize(logContext, async (actionRequest) => {
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
			logger.error(logContext, 'Failed to execute action request', {
				id: actionRequest.id,
				actor: actionRequest.data.actor!,
				error,
			});
		}
	});

	const closeWorker = async () => {
		await worker.stop();
		await kernel.disconnect(logContext);
		if (cache) {
			await cache.disconnect();
		}
	};

	const adminSession = await kernel.getContractById<SessionContract>(
		logContext,
		kernel.adminSession()!,
		kernel.adminSession()!,
	);
	strict(adminSession);

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
				actor: adminSession.data.actor,
			},
			{
				type: 'action-request@1.0.0',
				data: {
					...preResults,
					context: logContext,
					epoch: actionRequestDate.valueOf(),
					timestamp: actionRequestDate.toISOString(),
					actor: adminSession.data.actor,
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

	// Set up guest user
	logger.info(logContext, 'Setting up guest user');
	const guestUser = await kernel.getContractBySlug(
		logContext,
		kernel.adminSession()!,
		'user-guest@latest',
	);
	const guestSession = await kernel.replaceContract(
		logContext,
		kernel.adminSession()!,
		autumndb.Kernel.defaults({
			slug: 'session-guest',
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: guestUser!.id,
			},
		}),
	);
	logger.info(logContext, 'Done setting up guest session');

	// Set up routes/middlewares now that we're ready to serve http traffic
	webServer.ready(kernel, worker, {
		guestSession: guestSession.id,
		sync: worker.sync,
	});

	// Manually bootstrap channels
	// TODO: This should ideally be completely automated, but this would
	// require that triggered actions are up and running before any
	// channel contracts are loaded.
	const contracts = worker.pluginManager.getCards();
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
			return worker.insertCard<ActionRequestContract>(
				logContext,
				kernel.adminSession()!,
				worker.typeContracts['action-request@1.0.0'],
				{
					attachEvents: false,
					timestamp: new Date().toISOString(),
				},
				{
					type: 'action-request@1.0.0',
					data: {
						action: 'action-bootstrap-channel@1.0.0',
						context: logContext,
						card: channelContract!.id,
						type: channelContract!.type,
						actor: adminSession.data.actor,
						epoch: new Date().valueOf(),
						input: {
							id: channelContract!.id,
						},
						timestamp: new Date().toISOString(),
						arguments: {},
					},
				},
			);
		}),
	);

	// TODO: Find out where this race condition is happening
	// Wait for the server to settle before starting
	await setTimeout(2000);

	return {
		worker,
		kernel,
		guestSession: guestSession.id,
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
