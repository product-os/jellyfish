const environment = require('@balena/jellyfish-environment').defaultEnvironment;
const ava = require('ava');
const crypto = require('crypto');
const jws = require('jsonwebtoken');
const _ = require('lodash');
const jose = require('node-jose');
const { v4: uuid } = require('uuid');
const helpers = require('./helpers');

const balenaAvaTest = _.some(
	_.values(environment.integration['balena-api']),
	_.isEmpty,
)
	? ava.skip
	: ava.serial;

balenaAvaTest(
	'should take application/jose balena-api webhooks',
	async (test) => {
		const token = environment.integration['balena-api'];
		console.log(
			`[test application/jose webhooks] Using token ${JSON.stringify(
				token,
				null,
				2,
			)}`,
		);

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
		console.log(
			`[test application/jose webhooks] Using signedToken ${signedToken}`,
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

		console.log(
			`[test application/jose webhooks] Calling endpoint '/api/v2/hooks/balena-api' with payload ${payload}`,
		);

		const result = await helpers.http(
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
		const result = await helpers.http('POST', '/api/v2/hooks/github', {
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

		const result = await helpers.http(
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
	const result = await helpers.http(
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
