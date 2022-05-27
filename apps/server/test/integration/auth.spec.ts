import { defaultEnvironment } from '@balena/jellyfish-environment';
import nock from 'nock';
import { after, before, beforeEach } from './helpers';

const context: any = {};

beforeAll(async () => {
	nock.cleanAll();
	nock(defaultEnvironment.hydra.adminHost)
		.persist()
		.post('/clients')
		.reply(200, {});

	await before(context);
	beforeEach(context);
});

afterAll(async () => {
	nock.cleanAll();
	await after(context);
});

const getSelfWithHeaders = async (headers = {}) => {
	return context.http('GET', '/api/v2/whoami', {}, headers);
};

test('server should associate requests with no credentials with a guest user', async () => {
	const { response } = await getSelfWithHeaders({});
	expect(!response.error);
	expect(response.data.slug).toMatch('user-guest');
});

test('server should associate requests with an invalid authentication header with a guest user', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: 'Bearer foobar',
	});
	expect(response.error);
	expect(response.data.slug).toMatch('user-guest');
});

test('server should accept requests containing a valid session ID in the authorization header', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.session.id}`,
	});
	expect(!response.error);
	expect(response.data.slug).not.toMatch('user-guest');
});

test('server should accept requests containing the session id and token in the authorization header in <id>.<token> format', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.session.id}.${context.sessionToken}`,
	});
	expect(!response.error);
	expect(response.data.slug).not.toMatch('user-guest');
});

test('auth middleware should NOT accept requests containing only the session token in the authorization header', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.sessionToken}`,
	});
	expect(response.error);
	expect(response.data.slug).toMatch('user-guest');
});
