/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import nock from 'nock';
import querystring from 'querystring';
import { v4 as uuid } from 'uuid';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import * as helpers from './helpers';

/**
 * @summary Convert to slug-compatible string
 * @function
 * @private
 *
 * @param {String} string - string to convert
 * @returns {String} slugified string
 */
const slugify = (str) => {
	return str
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-');
};

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret &&
	environment.integration.outreach.signature
		? test
		: test.skip;

const balenaApiTest =
	environment.integration['balena-api'].appId &&
	environment.integration['balena-api'].appSecret &&
	environment.integration['balena-api'].oauthBaseUrl
		? test
		: test.skip;

const context: any = {};

beforeAll(async () => {
	await helpers.before(context);
});

afterAll(async () => {
	await helpers.after(context);
});

beforeEach(async () => {
	await helpers.beforeEach(context);
});

afterEach(async () => {
	await helpers.afterEach(context);
});

outreachTest('should be able to associate a user with Outreach', async () => {
	const userCard = await context.sdk.card.create({
		type: 'user',
		slug: context.generateRandomSlug({
			prefix: 'user-oauth-test',
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			hash: 'PASSWORDLESS',
			roles: ['user-community'],
		},
	});

	nock.cleanAll();

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (_uri, request, callback) {
			const body = querystring.decode(request as any);

			if (
				_.isEqual(body, {
					grant_type: 'authorization_code',
					client_id: environment.integration.outreach.appId,
					client_secret: environment.integration.outreach.appSecret,
					redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
					code: '123456',
				})
			) {
				return callback(null, [
					200,
					{
						access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
						scope: 'create',
					},
				]);
			}

			return callback(null, [
				400,
				{
					error: 'invalid_request',
					error_description: 'Something went wrong',
				},
			]);
		});

	const result = await context.http(
		'GET',
		`/oauth/outreach?code=123456&state=${userCard.slug}`,
	);

	expect(result.code).toBe(200);
	expect(typeof result.response.access_token).toBe('string');
	expect(result.response.token_type).toBe('Bearer');

	const newUserCard = await context.sdk.card.get(userCard.slug);

	expect(newUserCard.data.oauth).toEqual({
		outreach: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create',
		},
	});

	nock.cleanAll();
});

outreachTest(
	'should not be able to associate a user with Outreach given the wrong code',
	async () => {
		const userCard = await context.sdk.card.create({
			type: 'user',
			slug: context.generateRandomSlug({
				prefix: 'user-oauth-test',
			}),
			version: '1.0.0',
			data: {
				email: 'test@jellysync.io',
				hash: 'PASSWORDLESS',
				roles: ['user-community'],
			},
		});

		nock.cleanAll();

		await nock('https://api.outreach.io')
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration.outreach.appId,
						client_secret: environment.integration.outreach.appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http(
			'GET',
			`/oauth/outreach?code=999999999&state=${userCard.slug}`,
		);

		expect(result).toEqual({
			code: 401,
			headers: result.headers,
			response: {
				error: true,
				data: {
					message: result.response.data.message,
					name: 'OAuthUnsuccessfulResponse',
				},
			},
		});

		const newUserCard = await context.sdk.card.get(userCard.slug);
		expect(newUserCard.data.oauth).toBeFalsy();
		nock.cleanAll();
	},
);

outreachTest(
	'should not be able to associate a user with Outreach given no state',
	async () => {
		const userCard = await context.sdk.card.create({
			type: 'user',
			slug: context.generateRandomSlug({
				prefix: 'user-oauth-test',
			}),
			version: '1.0.0',
			data: {
				email: 'test@jellysync.io',
				hash: 'PASSWORDLESS',
				roles: ['user-community'],
			},
		});

		nock.cleanAll();

		await nock('https://api.outreach.io')
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration.outreach.appId,
						client_secret: environment.integration.outreach.appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http('GET', '/oauth/outreach?code=123456');

		expect(result.code).toBe(401);

		const newUserCard = await context.sdk.card.get(userCard.slug);
		expect(newUserCard.data.oauth).toBeFalsy();
		nock.cleanAll();
	},
);

outreachTest(
	'should not be able to associate a user with Outreach given an invalid state',
	async () => {
		const userCard = await context.sdk.card.create({
			type: 'user',
			slug: context.generateRandomSlug({
				prefix: 'user-oauth-test',
			}),
			version: '1.0.0',
			data: {
				email: 'test@jellysync.io',
				hash: 'PASSWORDLESS',
				roles: ['user-community'],
			},
		});

		nock.cleanAll();

		await nock('https://api.outreach.io')
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration.outreach.appId,
						client_secret: environment.integration.outreach.appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http(
			'GET',
			'/oauth/outreach?code=123456&state=testtesttesttest',
		);

		expect(result.code).toBe(401);

		const newUserCard = await context.sdk.card.get(userCard.slug);
		expect(newUserCard.data.oauth).toBeFalsy();
		nock.cleanAll();
	},
);

balenaApiTest(
	'should be able to associate a user with Balena Api',
	async () => {
		const userCard = await context.sdk.card.create({
			type: 'user',
			slug: context.generateRandomSlug({
				prefix: 'user-oauth-test',
			}),
			version: '1.0.0',
			data: {
				email: 'test@jellysync.io',
				hash: 'PASSWORDLESS',
				roles: ['user-external-support'],
			},
		});

		nock.cleanAll();

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.get('/user/v1/whoami')
			.reply(function (_uri, _request, callback) {
				callback(null, [
					200,
					{
						username: userCard.slug.substring('user-'.length),
					},
				]);
			});

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration['balena-api'].appId,
						client_secret: environment.integration['balena-api'].appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/balena-api`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http(
			'GET',
			`/oauth/balena-api?code=123456&state=${userCard.slug}`,
		);

		expect(result.code).toBe(200);
		expect(typeof result.response.access_token).toBe('string');
		expect(result.response.token_type).toBe('Bearer');

		const newUserCard = await context.sdk.card.get(userCard.slug);

		expect(newUserCard.data.oauth).toEqual({
			'balena-api': {
				access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
				scope: 'create',
			},
		});

		nock.cleanAll();
	},
);

balenaApiTest(
	'should be able to associate a user with Balena Api with an unreliable whoami endpoint',
	async () => {
		const userCard = await context.sdk.card.create({
			type: 'user',
			slug: context.generateRandomSlug({
				prefix: 'user-oauth-test',
			}),
			version: '1.0.0',
			data: {
				email: 'test@jellysync.io',
				hash: 'PASSWORDLESS',
				roles: ['user-external-support'],
			},
		});

		nock.cleanAll();

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.get('/user/v1/whoami')
			.reply(function (_uri, _request, callback) {
				callback(null, [429]);
			});

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.get('/user/v1/whoami')
			.reply(function (_uri, _request, callback) {
				callback(null, [
					200,
					{
						username: userCard.slug.substring('user-'.length),
					},
				]);
			});

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration['balena-api'].appId,
						client_secret: environment.integration['balena-api'].appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/balena-api`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http(
			'GET',
			`/oauth/balena-api?code=123456&state=${userCard.slug}`,
		);

		expect(result.code).toBe(200);
		expect(typeof result.response.access_token).toBe('string');
		expect(result.response.token_type).toBe('Bearer');

		const newUserCard = await context.sdk.card.get(userCard.slug);

		expect(newUserCard.data.oauth).toEqual({
			'balena-api': {
				access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
				scope: 'create',
			},
		});

		nock.cleanAll();
	},
);

balenaApiTest(
	'should be able to create a user if no matching user found and then associate it with Balena Api',
	async () => {
		const username = uuid();
		const slug = `user-${slugify(username)}`;

		nock.cleanAll();

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.get('/user/v1/whoami')
			.reply(function (_uri, _request, callback) {
				callback(null, [
					200,
					{
						username,
					},
				]);
			});

		await nock(environment.integration['balena-api'].oauthBaseUrl)
			.post('/oauth/token')
			.reply(function (_uri, request, callback) {
				const body = querystring.decode(request as any);

				if (
					_.isEqual(body, {
						grant_type: 'authorization_code',
						client_id: environment.integration['balena-api'].appId,
						client_secret: environment.integration['balena-api'].appSecret,
						redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/balena-api`,
						code: '123456',
					})
				) {
					return callback(null, [
						200,
						{
							access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
							scope: 'create',
						},
					]);
				}

				return callback(null, [
					400,
					{
						error: 'invalid_request',
						error_description: 'Something went wrong',
					},
				]);
			});

		const result = await context.http(
			'GET',
			`/oauth/balena-api?code=123456&state=${slug}`,
		);

		expect(result.code).toBe(200);
		expect(typeof result.response.access_token).toBe('string');
		expect(result.response.token_type).toBe('Bearer');

		const newUserCard = await context.sdk.card.get(slug);

		expect(newUserCard.data.oauth).toEqual({
			'balena-api': {
				access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
				scope: 'create',
			},
		});

		nock.cleanAll();
	},
);
