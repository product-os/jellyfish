import { getSdk } from '@balena/jellyfish-client-sdk';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import bcrypt from 'bcrypt';
import _ from 'lodash';
import request from 'request';
import { v4 as uuidv4 } from 'uuid';
import { setTimeout } from 'timers/promises';
import { bootstrap } from '../../lib/bootstrap';
import { getPlugins } from '../../lib/plugins';

const workerOptions = {
	onError: (_context, error) => {
		throw error;
	},
	database: {
		database: `test_${uuidv4().replace(/-/g, '_')}`,
	},
};

export const before = async (context) => {
	context.context = {
		id: `SERVER-TEST-${uuidv4()}`,
	};

	context.server = await bootstrap(context.context, {
		...workerOptions,
		plugins: getPlugins(),
	});

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

	context.createUser = async (username: string) => {
		const { sdk } = context;
		const slug = `user-${username}`;
		const usrContract =
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
		const orgContract = await sdk.card.get('org-balena');
		await sdk.card.link(usrContract, orgContract, 'is member of');
		return usrContract;
	};

	const userContract = await context.createUser(context.username);

	context.sessionToken = uuidv4();

	// Force login, even if we don't know the password
	context.session = await context.sdk.card.create({
		slug: `session-${userContract.slug}-integration-tests-${uuidv4()}`,
		type: 'session',
		version: '1.0.0',
		data: {
			actor: userContract.id,
			token: {
				authentication: await bcrypt.hash(context.sessionToken, 12),
			},
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
		await setTimeout(1000);
		return context.waitForMatch(query, times - 1);
	};
};

export const after = async (context) => {
	context.sdk.cancelAllStreams();
	context.sdk.cancelAllRequests();
	await context.server.close();
};

export const beforeEach = (context) => {
	context.generateRandomSlug = (options: { prefix?: string } = {}): string => {
		const slug = uuidv4();
		if (options.prefix) {
			return `${options.prefix}-${slug}`;
		}

		return slug;
	};

	context.http = (method, uri, payload, headers, options: any = {}) => {
		return new Promise((resolve, reject) => {
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
