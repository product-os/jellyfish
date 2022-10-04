import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { testUtils as aTestUtils } from 'autumndb';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { initSdk, login, teardown } from '../sdk/helpers';
import { generateUserDetails, http } from './helpers';

const sdk = initSdk();

beforeAll(async () => {
	await login(sdk);
});

afterEach(() => {
	teardown();
});

test('should parse application/vnd.api+json bodies', async () => {
	const result = await http(
		'POST',
		'/api/v2/login',
		{
			username: environment.test.user.username,
			password: environment.test.user.password,
		},
		{
			'Content-Type': 'application/vnd.api+json',
		},
	);

	expect(result.code).toEqual(200);
	expect(result.headers['x-request-id']).toBeDefined();
	expect(result.headers['x-api-id']).toBeDefined();
});

test('should login as the default test user', async () => {
	const result = await http(
		'POST',
		'/api/v2/login',
		{
			username: environment.test.user.username,
			password: environment.test.user.password,
		},
		{
			'Content-Type': 'application/vnd.api+json',
		},
	);

	expect(result.code).toEqual(200);
});

test('should include the request and api ids on responses', async () => {
	const result = await http(
		'POST',
		'/api/v2/login',
		{
			username: environment.test.user.username,
			password: environment.test.user.password,
		},
		{
			'Content-Type': 'application/vnd.api+json',
		},
	);

	expect(result.code).toEqual(200);
	expect(result.headers['x-request-id']).toBeDefined();
	expect(result.headers['x-api-id']).toBeDefined();
});

test('should create different request ids for every response', async () => {
	const userDetails = generateUserDetails();
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password,
		},
	});

	const result1 = await http('POST', '/api/v2/action', {
		card: `${user.slug}@${user.version}`,
		type: 'user',
		action: 'action-create-session@1.0.0',
		arguments: {
			password: userDetails.password,
		},
	});

	const result2 = await http('POST', '/api/v2/action', {
		card: `${user.slug}@${user.version}`,
		type: 'user',
		action: 'action-create-session@1.0.0',
		arguments: {
			password: userDetails.password,
		},
	});

	const result3 = await http('POST', '/api/v2/action', {
		card: `${user.slug}@${user.version}`,
		type: 'user',
		action: 'action-create-session@1.0.0',
		arguments: {
			password: userDetails.password,
		},
	});

	expect(result1.headers['x-request-id']).not.toEqual(
		result2.headers['x-request-id'],
	);
	expect(result2.headers['x-request-id']).not.toEqual(
		result3.headers['x-request-id'],
	);
	expect(result3.headers['x-request-id']).not.toEqual(
		result1.headers['x-request-id'],
	);
});

test('The ping endpoint should continuously work', async () => {
	const result1 = await http('GET', '/ping');
	expect(result1.code).toEqual(200);
	expect(result1.response.error).toBe(false);

	const result2 = await http('GET', '/ping');
	expect(result2.code).toEqual(200);
	expect(result2.response.error).toBe(false);

	const result3 = await http('GET', '/ping');
	expect(result3.code).toEqual(200);
	expect(result3.response.error).toBe(false);
});

test('should fail to query with single quotes JSON object', async () => {
	const token = sdk.getAuthToken();
	const result = await http(
		'POST',
		'/api/v2/query',
		"{'foo':bar}",
		{
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		{
			json: false,
		},
	);

	expect(result.code).toEqual(400);
	expect(JSON.parse(result.response).error).toBe(true);
});

test('should fail to query with a non JSON string', async () => {
	const token = sdk.getAuthToken();
	const result = await http('POST', '/api/v2/query', 'foo:bar', {
		Authorization: `Bearer ${token}`,
	});

	expect(result.code).toEqual(400);
	expect(result.response.error).toBe(true);
});

test('should fail to query with an invalid query object', async () => {
	const token = sdk.getAuthToken();
	const result = await http(
		'POST',
		'/api/v2/query',
		{
			foo: 'bar',
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(400);
	expect(result.response.error).toBe(true);
});

test('should get all elements by type', async () => {
	const token = sdk.getAuthToken();
	const result = await http('GET', '/api/v2/type/user', null, {
		Authorization: `Bearer ${token}`,
	});

	expect(result.code).toEqual(200);

	const users = await sdk.query({
		type: 'object',
		required: ['type'],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user@1.0.0',
			},
		},
	});

	expect(result.response.length).toEqual(users.length);
	expect(result.response).toEqual(users);
});

test('should fail with a user error when executing an unknown action', async () => {
	const token = sdk.getAuthToken();
	const result = await http(
		'POST',
		'/api/v2/action',
		{
			card: 'user-admin@1.0.0',
			type: 'user',
			action: 'action-foo-bar-baz-qux@1.0.0',
			arguments: {
				foo: 'bar',
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(400);
	expect(result.response.error).toBe(true);
});

test('should fail with a user error given an arguments mismatch', async () => {
	const token = sdk.getAuthToken();
	const result = await http(
		'POST',
		'/api/v2/action',
		{
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				foo: 'bar',
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(400);
	expect(result.response.error).toBe(true);
});

test('an update that renders a card invalid for its type is a user error', async () => {
	const token = sdk.getAuthToken();
	const slug = `ping-test-${uuid()}`;

	const result1 = await http(
		'POST',
		'/api/v2/action',
		{
			card: 'ping@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						timestamp: new Date().toISOString(),
					},
				},
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result1.code).toEqual(200);

	const result2 = await http(
		'POST',
		'/api/v2/action',
		{
			card: result1.response.data.id,
			type: result1.response.data.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/timestamp',
						value: 'foo',
					},
				],
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result2.code).toEqual(400);
	expect(result2.response.error).toBe(true);
});

test('should fail with a user error if no action card type', async () => {
	const token = sdk.getAuthToken();
	const slug = `ping-test-${uuid()}`;

	const result = await http(
		'POST',
		'/api/v2/action',
		{
			card: 'ping@1.0.0',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						timestamp: new Date().toISOString(),
					},
				},
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(400);
	expect(result.response.error).toBe(true);
});

test('should report a user error if creating the same event twice', async () => {
	const token = sdk.getAuthToken();

	const thread = await sdk.card.create({
		type: 'thread',
		slug: aTestUtils.generateRandomSlug({
			prefix: 'thread',
		}),
		version: '1.0.0',
		data: {},
	});

	const args = {
		slug: aTestUtils.generateRandomSlug({
			prefix: 'whisper',
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: 'foo bar baz',
			alertsUser: [],
			mentionsUser: [],
		},
	};

	const result1 = await http(
		'POST',
		'/api/v2/action',
		{
			card: thread.id,
			type: thread.type,
			action: 'action-create-event@1.0.0',
			arguments: args,
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	const result2 = await http(
		'POST',
		'/api/v2/action',
		{
			card: thread.id,
			type: thread.type,
			action: 'action-create-event@1.0.0',
			arguments: args,
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result1.code).toEqual(200);
	expect(result2.code).toEqual(400);
	expect(result2.response.error).toBe(true);
});

test('should respond with an error given a payload middleware exception', async () => {
	const token = sdk.getAuthToken();
	const data = {};

	for (const time of _.range(0, 1000)) {
		data[`${time}-${uuid()}`] = {
			foo: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			bar: _.range(1, 10000),
			baz: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			xxx: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			yyy: _.range(1, 10000),
			zzz: 'foo bar baz qux foo bar baz qux foo bar baz qux',
		};
	}

	const result = await http(
		'POST',
		'/api/v2/action',
		{
			card: 'card@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: {
					slug: aTestUtils.generateRandomSlug({
						prefix: 'payload-test',
					}),
					version: '1.0.0',
					data,
				},
			},
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(413);
	expect(result.response).toEqual({
		error: true,
		data: {
			expected: 98061090,
			expose: true,
			length: 98061090,
			limit: 5242880,
			headers: result.response.data.headers,
			ip: result.response.data.ip,
			url: '/api/v2/action',
			method: 'POST',
			name: 'PayloadTooLargeError',
			message: result.response.data.message,
			stack: result.response.data.stack,
			status: 413,
			statusCode: 413,
			type: 'entity.too.large',
		},
	});
});

test("/query endpoint should allow you to query using a view's slug", async () => {
	const token = sdk.getAuthToken();
	const result = await http(
		'POST',
		'/api/v2/query',
		{
			query: 'view-all-views',
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(200);
	expect(
		_.uniq(
			_.map(result.response.data, (card) => {
				return _.first(card.type.split('@'));
			}),
		),
	).toEqual(['view']);
});

test("/query endpoint should allow you to query using a view's id", async () => {
	const token = sdk.getAuthToken();
	const view = await sdk.card.get('view-all-views');
	const result = await http(
		'POST',
		'/api/v2/query',
		{
			query: view.id,
		},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	expect(result.code).toEqual(200);
	expect(
		_.uniq(
			_.map(result.response.data, (card) => {
				return _.first(card.type.split('@'));
			}),
		),
	).toEqual(['view']);
});

test('whoami should respond even if user has little permissions', async () => {
	const roleSlug = aTestUtils.generateRandomSlug({
		prefix: 'role-user',
	});

	await sdk.action({
		card: 'role@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: roleSlug,
				version: '1.0.0',
				data: {
					read: {
						type: 'object',
						additionalProperties: false,
						required: ['id', 'slug', 'type'],
						properties: {
							id: {
								type: 'string',
							},
							slug: {
								type: 'string',
							},
							type: {
								type: 'string',
								enum: ['session@1.0.0', 'user@1.0.0'],
							},
						},
					},
				},
			},
		},
	});

	const userDetails = generateUserDetails();
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password,
		},
	});

	const session = await sdk.card.create({
		type: 'session@1.0.0',
		slug: generateRandomSlug({
			prefix: 'session',
		}),
		version: '1.0.0',
		data: {
			actor: user.id,
		},
	});

	await sdk.card.update(user.id, user.type, [
		{
			op: 'replace',
			path: '/data/roles',
			value: [roleSlug.replace(/^role-/, '')],
		},
	]);

	const result = await http(
		'GET',
		'/api/v2/whoami',
		{},
		{
			Authorization: `Bearer ${session.id}`,
		},
	);

	expect(result.response.error).toBe(false);
	expect(result.response.data.id).toEqual(user.id);
});
