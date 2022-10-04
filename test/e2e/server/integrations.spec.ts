import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import crypto from 'crypto';
import jws from 'jsonwebtoken';
import _ from 'lodash';
import jose from 'node-jose';
import { v4 as uuid } from 'uuid';
import { http } from './helpers';

test(
	'should take application/jose balena-api webhooks',
	async () => {
		const token = environment.integration['balena-api'];
		const object = {
			test: 1,
		};

		const signedToken = jws.sign(
			{
				data: object,
			},
			Buffer.from(token.privateKey, 'base64'),
			{
				algorithm: 'ES256',
				expiresIn: 10 * 60 * 1000,
				audience: 'jellyfish',
				issuer: 'api.balena-cloud.com',
				jwtid: uuid(),
				subject: uuid(),
			},
		);

		const keyValue = Buffer.from(token.production.publicKey, 'base64');

		const encryptionKey = await jose.JWK.asKey(keyValue, 'pem');

		const cipher = jose.JWE.createEncrypt(
			{
				format: 'compact',
			},
			encryptionKey,
		);
		cipher.update(signedToken);
		const payload = await cipher.final();

		const result = await http(
			'POST',
			'/api/v2/hooks/balena-api',
			payload,
			{
				'Content-Type': 'application/jose',
			},
			{
				json: false,
			},
		);

		test.is(result.code, 200);
		const response = JSON.parse(result.response);
		test.false(response.error);
	},
);

const githubAvaTest = _.some(
	_.values(environment.integration.github),
	_.isEmpty,
)
	? ava.skip
	: ava.serial;

githubAvaTest(
	'should not be able to post a GitHub event without a signature',
	async (test) => {
		const result = await http('POST', '/api/v2/hooks/github', {
			foo: 'bar',
			bar: 'baz',
			sender: {
				login: 'johndoe',
			},
		});

		test.is(result.code, 401);
		test.true(result.response.error);
	},
);

githubAvaTest(
	'should take a GitHub event with a valid signature',
	async (test) => {
		const object = '{"foo":"bar","sender":{"login":"johndoe"}}';
		const hash = crypto
			.createHmac('sha1', environment.integration.github.signature)
			.update(object)
			.digest('hex');

		const result = await http(
			'POST',
			'/api/v2/hooks/github',
			JSON.parse(object),
			{
				'x-hub-signature': `sha1=${hash}`,
			},
		);

		test.is(result.code, 200);
		test.false(result.response.error);
	},
);

ava.serial('should not ignore a GitHub signature mismatch', async (test) => {
	const result = await http(
		'POST',
		'/api/v2/hooks/github',
		{
			foo: 'bar',
			bar: 'baz',
		},
		{
			'x-hub-signature': 'sha1=xxxxxxxxxxxxxxx',
		},
	);

	test.is(result.code, 401);
	test.true(result.response.error);
});

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret &&
	environment.integration.outreach.signature
		? ava.serial
		: ava.serial.skip;

outreachTest(
	'should not be able to post an Outreach event without a signature',
	async (test) => {
		const result = await http('POST', '/api/v2/hooks/outreach', {
			foo: 'bar',
			bar: 'baz',
		});

		test.is(result.code, 401);
		test.true(result.response.error);
	},
);

outreachTest(
	'should take an Outreach event with a valid signature',
	async (test) => {
		// eslint-disable-next-line max-len
		const object =
			'{"data":{"type":"sequence","id":54,"attributes":{"updatedAt":"2019-08-15T19:52:07.000Z","throttleMaxAddsPerDay":70},"relationships":{}},"meta":{"deliveredAt":"2019-08-15T19:52:07.697+00:00","eventName":"sequence.updated"}}';
		const hash = crypto
			.createHmac('sha256', environment.integration.outreach.signature)
			.update(object)
			.digest('hex');

		const result = await http(
			'POST',
			'/api/v2/hooks/outreach',
			JSON.parse(object),
			{
				'outreach-webhook-signature': hash,
			},
		);

		test.is(result.code, 200);
		test.false(result.response.error);
	},
);

ava.serial('should not ignore an Outreach signature mismatch', async (test) => {
	const result = await http(
		'POST',
		'/api/v2/hooks/outreach',
		{
			foo: 'bar',
			bar: 'baz',
		},
		{
			'outreach-webhook-signature': 'xxxxxxxxxxxxxxx',
		},
	);

	test.is(result.code, 401);
	test.true(result.response.error);
});

ava.serial(
	'/api/v2/oauth/oauth-provider-outreach@1.0.0/url should return authorizeUrl',
	async (test) => {
		const result = await http(
			'GET',
			'/api/v2/oauth/oauth-provider-outreach@1.0.0/url',
		);

		const scopes = [
			'mailboxes.all',
			'prospects.all',
			'sequences.all',
			'sequenceStates.all',
			'sequenceSteps.all',
			'sequenceTemplates.all',
			'webhooks.all',
		];

		test.is(result.code, 200);
		test.is(result.response.error, false);

		const url = new URL(result.response.data.url);
		test.is(
			url.origin + url.pathname,
			'https://api.outreach.io/oauth/authorize',
		);

		test.deepEqual(Object.fromEntries(url.searchParams), {
			client_id: environment.integration.outreach.appId,
			response_type: 'code',
			redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
			scope: scopes.join('+'),
		});
	},
);
