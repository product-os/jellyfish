/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { v4 as uuid } from 'uuid';
import Bluebird from 'bluebird';
import request from 'request';
import _ from 'lodash';
import { getSdk } from '@balena/jellyfish-client-sdk';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { bootstrap } from '../../lib/bootstrap';
import { getPluginManager } from '../../lib/plugins';
import { bootstrapWorker } from '../../../action-server/lib/bootstrap';

const workerOptions = {
	onError: (_context, error) => {
		throw error;
	},
	database: {
		database: `test_${uuid().replace(/-/g, '_')}`,
	},
};

export const before = async (context) => {
	context.context = {
		id: `SERVER-TEST-${uuid()}`,
	};

	context.server = await bootstrap(context.context, {
		database: workerOptions.database,
		pluginManager: getPluginManager(context.context),
	});
	context.actionWorker = await bootstrapWorker(context.context, workerOptions);

	context.sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`,
	});

	const token = await context.sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password,
	});

	context.token = token.id;
	context.sdk.setAuthToken(context.token);
	context.username = environment.integration.default.user;

	context.createUser = async (username) => {
		const { sdk } = context;
		const slug = `user-${username}`;
		const usrCard =
			(await sdk.card.get(slug)) ||
			(await sdk.action({
				card: 'user@1.0.0',
				type: 'type',
				action: 'action-create-user@1.0.0',
				arguments: {
					username: slug,
					email: `${username}@example.com`,
					password: 'foobarbaz',
				},
			}));
		const orgCard = await sdk.card.get('org-balena');
		await sdk.card.link(usrCard, orgCard, 'is member of');
		return usrCard;
	};

	const userCard = await context.createUser(context.username);

	// Force login, even if we don't know the password
	context.session = await context.sdk.card.create({
		slug: `session-${userCard.slug}-integration-tests-${uuid()}`,
		type: 'session',
		version: '1.0.0',
		data: {
			actor: userCard.id,
		},
	});

	await context.sdk.auth.loginWithToken(context.session.id);
	context.user = await context.sdk.auth.whoami();

	context.waitForMatch = async (query, times = 40) => {
		if (times === 0) {
			throw new Error('The wait query did not resolve');
		}

		const results = await context.sdk.query(query);

		if (results.length > 0) {
			return results[0];
		}
		await Bluebird.delay(1000);
		return context.waitForMatch(query, times - 1);
	};
};

export const after = async (context) => {
	context.sdk.cancelAllStreams();
	context.sdk.cancelAllRequests();
	await context.actionWorker.stop();
	await context.server.close();
};

export const beforeEach = (context) => {
	context.generateRandomSlug = (options: { prefix?: string } = {}): string => {
		const slug = uuid();
		if (options.prefix) {
			return `${options.prefix}-${slug}`;
		}

		return slug;
	};

	context.http = (method, uri, payload, headers, options: any = {}) => {
		return new Bluebird((resolve, reject) => {
			const requestOptions: any = {
				method,
				baseUrl: `${environment.http.host}:${environment.http.port}`,
				url: uri,
				json: _.isNil(options.json) ? true : options.json,
				headers,
			};

			if (payload) {
				requestOptions.body = payload;
			}

			request(requestOptions, (error, response, body) => {
				if (error) {
					return reject(error);
				}

				return resolve({
					code: response.statusCode,
					headers: response.headers,
					response: body,
				});
			});
		});
	};
};

export const afterEach = async (context) => {
	context.sdk.cancelAllStreams();
	context.sdk.cancelAllRequests();
};
