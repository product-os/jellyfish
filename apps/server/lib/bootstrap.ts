/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import * as core from '@balena/jellyfish-core';
import { Producer } from '@balena/jellyfish-queue';
import { Consumer } from '@balena/jellyfish-queue';
import { Worker } from '@balena/jellyfish-worker';
import { Sync } from '@balena/jellyfish-sync';
import * as assert from '@balena/jellyfish-assert';
import * as metrics from '@balena/jellyfish-metrics';
import { loadCards } from './card-loader';
import { createServer } from './http';
import { attachSocket } from './socket';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import type { core as coreType } from '@balena/jellyfish-types';

const logger = getLogger(__filename);

export const bootstrap = async (context, options) => {
	logger.info(context, 'Loading plugin sync integrations');
	const integrations = options.pluginManager.getSyncIntegrations(context);

	logger.info(context, 'Injecting integrations into Sync');
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

	logger.info(context, 'Instantiating core library');
	const backendOptions =
		options && options.database
			? Object.assign({}, environment.database.options, options.database)
			: environment.database.options;
	const jellyfish = (await core.create(context, cache, {
		backend: backendOptions,
	})) as any as coreType.JellyfishKernel;

	metrics.startServer(context, environment.metrics.ports.app);

	logger.info(context, 'Creating producer instance');
	const producer = new Producer(jellyfish, jellyfish.sessions.admin);
	logger.info(context, 'Initializing producer instance');
	await producer.initialize(context);

	// The main server has a special worker for itself so that
	// it can bootstrap without needing any external workers
	// to process the default cards
	logger.info(context, 'Creating built-in worker');

	// FIXME this abomination is due to calling worker.execute right after producer.storeRequest
	// Fix that, and this one will disappear (but it will leave the scars)
	const uninitializedConsumer = new Consumer(
		jellyfish,
		jellyfish.sessions.admin,
	);

	logger.info(context, 'Loading plugin actions');
	const actionLibrary = options.pluginManager.getActions(context);

	const worker = new Worker(
		jellyfish as any,
		jellyfish.sessions!.admin,
		actionLibrary,
		uninitializedConsumer as any,
		producer,
	);
	logger.info(context, 'Initializing built-in worker');
	await worker.initialize(context);

	logger.info(context, 'Inserting cards');
	const cards = options.pluginManager.getCards(context, core.cardMixins);

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

	_.forEach(channels, async (channel) => {
		const channelCard = await jellyfish.getCardBySlug(
			context,
			jellyfish.sessions!.admin,
			`${channel.slug}@${channel.version}`,
		);
		await producer.enqueue(worker.getId(), jellyfish.sessions!.admin, {
			action: 'action-bootstrap-channel@1.0.0',
			context,
			card: channelCard!.id,
			type: channelCard!.type,
			arguments: {},
		});
	});

	return {
		worker,
		jellyfish,
		producer,
		guestSession: results.guestSession.id,
		port: webServer.port,
		close: async () => {
			await socketServer.close();
			await webServer.stop();
			await jellyfish.disconnect(context);
			if (cache) {
				await cache.disconnect();
			}
		},
	};
};
