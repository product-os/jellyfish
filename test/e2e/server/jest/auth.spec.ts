import { after, before, beforeEach } from './helpers';

const context: any = {};

beforeAll(async () => {
	await before(context);
	beforeEach(context);
});

afterAll(async () => {
	await after(context);
});

const getSelfWithHeaders = async (headers = {}) => {
	return context.http('GET', '/api/v2/whoami', {}, headers);
};

const endpoints = {
	GET: [
		'/api/v2/id/:id',
		'/api/v2/slug/:slug',
		'/api/v2/file/:cardId/:fileName',
		'/api/v2/whoami',
		'/api/v2/type/:type',
	],
	POST: [
		'/api/v2/action',
		'/api/v2/query',
		'/api/v2/view/:slug',
		'/api/v2/signup',
	],
};

// tslint:disable-next-line: forin
for (const method in endpoints) {
	for (const endpoint of endpoints[method]) {
		test(`server should reject unauthenticated ${method} requests to ${endpoint}`, async () => {
			const { code, response } = await context.http(method, endpoint, {}, {});
			expect(response.error).toBe(true);
			expect(response.data).toBe('Invalid session');
			expect(code).toBe(401);
		});
	}
}

test('server should reject requests with an invalid authentication header', async () => {
	const { response, code } = await getSelfWithHeaders({
		Authorization: 'Bearer foobar',
	});
	expect(response.error).toBe(true);
	expect(response.data).toBe('Invalid session');
	expect(code).toBe(401);
});

test('server should accept requests containing a valid session ID in the authorization header', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.session.id}`,
	});
	expect(!response.error);
	expect(response.data.slug).toBeTruthy();
});

test('server should accept requests containing the session id and token in the authorization header in <id>.<token> format', async () => {
	const { response } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.session.id}.${context.sessionToken}`,
	});
	expect(!response.error);
	expect(response.data.slug).toBeTruthy();
});

test('auth middleware should NOT accept requests containing only the session token in the authorization header', async () => {
	const { response, code } = await getSelfWithHeaders({
		Authorization: `Bearer ${context.sessionToken}`,
	});
	expect(response.error).toBe(true);
	expect(response.data).toBe('Invalid session');
	expect(code).toBe(401);
});
