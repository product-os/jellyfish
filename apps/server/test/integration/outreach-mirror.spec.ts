import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { strict as assert } from 'assert';
import Bluebird from 'bluebird';
import _ from 'lodash';
import nock from 'nock';
import querystring from 'querystring';
import request from 'request';
import { v4 as uuid } from 'uuid';
import * as helpers from './helpers';
import * as outreachMock from './outreach-mock';

const TOKEN = environment.integration.outreach;
const context: any = {};

beforeAll(async () => {
	await helpers.before(context);
});

afterAll(async () => {
	await helpers.after(context);
});

const OAUTH_DETAILS = {
	access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
	token_type: 'bearer',
	expires_in: 3600,
	refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
	scope: 'create',
};

const NOCK_OPTS = {
	reqheaders: {
		Authorization: `Bearer ${OAUTH_DETAILS.access_token}`,
	},
};

beforeEach(async () => {
	helpers.beforeEach(test);

	context.getProspect = async (id: string) => {
		return new Bluebird((resolve, reject) => {
			request(
				{
					method: 'GET',
					baseUrl: 'https://api.outreach.io',
					uri: `/api/v2/prospects/${id}`,
					json: true,
					headers: {
						Authorization: NOCK_OPTS.reqheaders.Authorization,
					},
				},
				(error, response, body) => {
					if (error) {
						return reject(error);
					}

					if (response.statusCode === 404) {
						return resolve(null);
					}

					if (response.statusCode !== 200) {
						return reject(
							new Error(
								`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`,
							),
						);
					}

					return resolve(body);
				},
			);
		});
	};

	nock.cleanAll();
	nock.disableNetConnect();
	nock.enableNetConnect('localhost');

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.get('/api/v2/prospects')
		.query((object: any) => {
			return object['filter[emails]'];
		})
		.reply((uri, _body, callback) => {
			const params = querystring.parse(_.last(uri.split('?'))!);
			const result = outreachMock.getProspectByEmail(
				params['filter[emails]'] as any as string,
			);
			return callback(null, [result.code, result.response]);
		});

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.post('/api/v2/prospects')
		.reply((_uri, body, callback) => {
			const result = outreachMock.postProspect(body as any);
			return callback(null, [result.code, result.response]);
		});

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.patch(/^\/api\/v2\/prospects\/\d+$/)
		.reply((uri, body: any, callback: any) => {
			const id = _.parseInt(_.last(uri.split('/'))!);
			if (id !== body.data.id) {
				return callback(new Error('Ids do not match'));
			}

			const result = outreachMock.patchProspect(body);
			return callback(null, [result.code, result.response]);
		});

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.get(/^\/api\/v2\/prospects\/\d+$/)
		.reply((uri, _body, callback) => {
			const result = outreachMock.getProspect(
				_.parseInt(_.last(uri.split('/'))!),
			);
			return callback(null, [result.code, result.response]);
		});

	const user = await context.sdk.card.get(
		`user-${environment.integration.default.user}`,
	);

	await context.sdk.card.update(user.id, user.type, [
		{
			op: 'add',
			path: '/data/oauth',
			value: {},
		},
		{
			op: 'add',
			path: '/data/oauth/outreach',
			value: OAUTH_DETAILS,
		},
	]);
});

afterEach(async () => {
	await helpers.afterEach(context);
	nock.cleanAll();
});

const waitForContactWithMirror = async (username: string) => {
	return context.waitForMatch({
		type: 'object',
		required: ['slug', 'data'],
		properties: {
			slug: {
				const: `contact-${username}`,
			},
			data: {
				type: 'object',
				required: ['mirrors'],
				properties: {
					mirrors: {
						type: 'array',
						minItems: 1,
					},
				},
			},
		},
	});
};

// Skip all tests if there is no Outreach app id and secret
const conditionalTest = _.some(_.values(TOKEN), _.isEmpty) ? test.skip : test;

conditionalTest(
	'should update mirror URL to prospect with new email address',
	async () => {
		const username = `test-update-mirror-url-${uuid()}`;

		const prospectResult = await outreachMock.postProspect({
			data: {
				type: 'prospect',
				attributes: {
					emails: [`${username}-test@test.io`],
					firstName: 'John',
					lastName: 'Doe',
				},
			},
		});

		assert(prospectResult);

		expect(prospectResult.code).toBe(201);

		const createResult = await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: `${username}@test.io`,
				},
			},
		});

		const contact = await waitForContactWithMirror(username);

		expect(contact.data.mirrors).not.toEqual([
			prospectResult.response.data!.links.self,
		]);

		await context.sdk.card.update(createResult.id, createResult.type, [
			{
				op: 'replace',
				path: '/data/profile/email',
				value: `${username}-test@test.io`,
			},
		]);

		const newContact = await context.sdk.card.get(createResult.id);
		expect(newContact.data.mirrors).toEqual([
			prospectResult.response.data!.links.self,
		]);
	},
);

conditionalTest(
	'should not update remote prospects that do not exist',
	async () => {
		const username = `test-not-update-remote-prospects-${uuid()}`;

		const createResult = await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: `${username}@test.io`,
				},
			},
		});

		const mirrorUrl = 'https://api.outreach.io/api/v2/prospects/99999999999';

		await context.sdk.card.update(createResult.id, createResult.type, [
			{
				op: 'replace',
				path: '/data/mirrors',
				value: [mirrorUrl],
			},
		]);

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: [mirrorUrl],
			profile: {
				email: `${username}@test.io`,
			},
		});

		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!!);
		const prospect = await context.getProspect(prospectId);
		expect(prospect).toBeFalsy();
	},
);

conditionalTest('should handle pointless contact updates', async () => {
	const username = `test-handle-pointless-contact-updates-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email: `${username}@test.io`,
		},
	});

	// To trigger mirroring
	await context.sdk.card.update(contact.id, contact.type, [
		{
			op: 'add',
			path: '/data/foo',
			value: 'bar',
		},
	]);

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.occupation).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest(
	'should add a tag with the linked user external event slug origin type',
	async () => {
		const username = `test-add-tag-event-origin-type-${uuid()}`;

		const event = await context.sdk.card.create({
			slug: `external-event-${uuid()}`,
			type: 'external-event@1.0.0',
			data: {
				source: 'my-fake-service',
				headers: {},
				payload: {
					test: 1,
				},
			},
		});

		expect(event.id).toBeTruthy();

		const user = await context.sdk.card.create({
			slug: `user-${username}`,
			type: 'user',
			data: {
				email: `${username}@test.io`,
				origin: `${event.slug}@${event.version}`,
				roles: ['user-community'],
				hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			},
		});

		expect(user.id).toBeTruthy();

		const contact = await waitForContactWithMirror(username);

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
		expect(prospect.data.attributes.name).toBe(username);
		expect(prospect.data.attributes.tags).toEqual(['my-fake-service']);
		expect(prospect.data.attributes.nickname).toBe(username);
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest('should store the user country and city', async () => {
	const username = `test-country-city-${uuid()}`;

	const event = await context.sdk.card.create({
		slug: `external-event-${uuid()}`,
		type: 'external-event@1.0.0',
		data: {
			source: 'my-fake-service',
			headers: {},
			payload: {
				test: 1,
			},
		},
	});

	expect(event.id).toBeTruthy();

	const user = await context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: `${username}@test.io`,
			origin: event.id,
			roles: ['user-community'],
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			profile: {
				country: 'GB',
				city: 'Oxford',
			},
		},
	});

	expect(user.id).toBeTruthy();

	const contact = await waitForContactWithMirror(username);

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.tags).toEqual(['my-fake-service']);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.addressCity).toBe('Oxford');
	expect(prospect.data.attributes.addressCountry).toBe('GB');
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest(
	'should add a tag with the linked user external event id origin type',
	async () => {
		const username = `test-add-tag-event-id-origin-type-${uuid()}`;

		const event = await context.sdk.card.create({
			slug: `external-event-${uuid()}`,
			type: 'external-event@1.0.0',
			data: {
				source: 'my-fake-service',
				headers: {},
				payload: {
					test: 1,
				},
			},
		});

		expect(event.id).toBeTruthy();

		const user = await context.sdk.card.create({
			slug: `user-${username}`,
			type: 'user',
			data: {
				email: `${username}@test.io`,
				origin: event.id,
				roles: ['user-community'],
				hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			},
		});

		expect(user.id).toBeTruthy();

		const contact = await waitForContactWithMirror(username);

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
		expect(prospect.data.attributes.name).toBe(username);
		expect(prospect.data.attributes.tags).toEqual(['my-fake-service']);
		expect(prospect.data.attributes.nickname).toBe(username);
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest(
	'should correctly add an email address to a contact with more than one address',
	async () => {
		const username = `test-add-email-more-than-one-address-${uuid()}`;

		const createResult = await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: [`${username}@test.io`, `${username}@foo.io`],
				},
			},
		});

		await context.sdk.card.update(createResult.id, createResult.type, [
			{
				op: 'replace',
				path: '/data/profile/email',
				value: [
					`${username}@test.io`,
					`${username}@foo.io`,
					`${username}@gmail.io`,
				],
			},
		]);

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: contact.data.mirrors,
			profile: {
				email: [
					`${username}@test.io`,
					`${username}@foo.io`,
					`${username}@gmail.io`,
				],
			},
		});

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([
			`${username}@test.io`,
			`${username}@foo.io`,
			`${username}@gmail.io`,
		]);

		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest(
	'should not update a synced contact with an excluded address',
	async () => {
		const username = `test-not-update-excluded-address-${uuid()}`;

		const createResult = await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: `${username}@test.io`,
				},
			},
		});

		await context.sdk.card.update(createResult.id, createResult.type, [
			{
				op: 'replace',
				path: '/data/profile/email',
				value: `${username}@balena.io`,
			},
		]);

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: contact.data.mirrors,
			profile: {
				email: `${username}@balena.io`,
			},
		});

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest('should link a user with an existing prospect', async () => {
	const username = `test-link-existing-prospect-${uuid()}`;

	const prospectResult = await outreachMock.postProspect({
		data: {
			type: 'prospect',
			attributes: {
				emails: [`${username}@test.io`],
				firstName: 'John',
				lastName: 'Doe',
			},
		},
	});

	expect(prospectResult.code).toBe(201);

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
				city: 'Oxford',
				country: 'United Kingdom',
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email: `${username}@test.io`,
			city: 'Oxford',
			country: 'United Kingdom',
			name: {
				first: 'John',
				last: 'Doe',
			},
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.firstName).toBe('John');
	expect(prospect.data.attributes.lastName).toBe('Doe');
	expect(prospect.data.attributes.addressCity).toBe('Oxford');
	expect(prospect.data.attributes.addressCountry).toBe('United Kingdom');
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should sync a contact with multiple emails', async () => {
	const username = `test-sync-contact-multiple-emails-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: [`${username}@test.io`, `${username}@gmail.com`],
				company: 'Balena',
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			company: 'Balena',
			email: [`${username}@test.io`, `${username}@gmail.com`],
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([
		`${username}@test.io`,
		`${username}@gmail.com`,
	]);

	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.occupation).toBe('Balena');
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should create a simple contact', async () => {
	const username = `test-create-simple-contact-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email: `${username}@test.io`,
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.occupation).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should sync the contact type', async () => {
	const username = `test-sync-contact-type-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				type: 'professional',
				email: `${username}@test.io`,
				company: 'Balena',
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			company: 'Balena',
			type: 'professional',
			email: `${username}@test.io`,
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.occupation).toBe('Balena');
	expect(prospect.data.attributes.title).toBe('professional');
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should sync company name', async () => {
	const username = `test-sync-company-name-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
				company: 'Balena',
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			company: 'Balena',
			email: `${username}@test.io`,
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.occupation).toBe('Balena');
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should truncate long first names', async () => {
	const username = `test-truncate-long-first-name-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
				name: {
					first: 'Long Long Long Long Long Long Long Long Long Long Long',
				},
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email: `${username}@test.io`,
			name: {
				first: 'Long Long Long Long Long Long Long Long Long Long Long',
			},
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.firstName).toBe(
		'Long Long Long Long Long Long Long Long Long Lo...',
	);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should truncate long last names', async () => {
	const username = `test-truncate-long-last-name-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email: `${username}@test.io`,
				name: {
					last: 'Last Last Last Last Last Last Last Last Last Last Last',
				},
			},
		},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email: `${username}@test.io`,
			name: {
				last: 'Last Last Last Last Last Last Last Last Last Last Last',
			},
		},
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.lastName).toBe(
		'Last Last Last Last Last Last Last Last Last La...',
	);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest(
	'should use username as GitHub handle if slug starts with user-gh- (from Balena Cloud)',
	async () => {
		const handle = uuid();
		const username = `gh-${handle}`;

		await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: `${username}@test.io`,
				},
			},
		});

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: contact.data.mirrors,
			profile: {
				email: `${username}@test.io`,
			},
		});

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([`${username}@test.io`]);
		expect(prospect.data.attributes.name).toBe(username);
		expect(prospect.data.attributes.githubUsername).toBe(handle);
		expect(prospect.data.attributes.nickname).toBe(username);
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest('should create a simple contact without an email', async () => {
	const username = `test-simple-contact-without-email-${uuid()}`;

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {},
	});

	const contact = await waitForContactWithMirror(username);

	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
	});

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);
});

conditionalTest('should not mirror a user card type', async () => {
	const username = `test-not-mirror-user-card-type-${uuid()}`;

	const createResult = await context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: `${username}@balena.io`,
			roles: ['user-community'],
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		},
	});

	const user = await context.sdk.card.get(createResult.id);

	expect(user.data.mirrors).toBeFalsy();
	expect(user.data.email).toEqual(`${username}@balena.io`);
	expect(user.data.roles).toEqual(['user-community']);
	expect(user.data.hash).toEqual(
		'$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
	);

	const results = await outreachMock.getProspectByEmail(
		`${username}@balena.io`,
	);
	expect(results).toEqual({
		code: 200,
		response: {
			data: [],
			meta: {
				count: 0,
			},
		},
	});
});

conditionalTest(
	'should not create a prospect with an excluded email address',
	async () => {
		const username = `test-not-create-prospect-excluded-email-address-${uuid()}`;

		const createResult = await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: `${username}@balena.io`,
				},
			},
		});

		const contact = await context.sdk.card.get(createResult.id);

		expect(contact.data).toEqual({
			profile: {
				email: `${username}@balena.io`,
			},
		});

		const results = await outreachMock.getProspectByEmail(
			`${username}@balena.io`,
		);
		expect(results).toEqual({
			code: 200,
			response: {
				data: [],
				meta: {
					count: 0,
				},
			},
		});
	},
);

conditionalTest(
	'should not sync emails on contacts with new@change.me',
	async () => {
		const username = `test-not-sync-emails-new-changeme-${uuid()}`;

		await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: 'new@change.me',
				},
			},
		});

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: contact.data.mirrors,
			profile: {
				email: 'new@change.me',
			},
		});

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([]);
		expect(prospect.data.attributes.name).toBe(username);
		expect(prospect.data.attributes.nickname).toBe(username);
		expect(prospect.data.attributes.githubUsername).toBeFalsy();
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest(
	'should not sync emails on contacts with unknown@change.me',
	async () => {
		const username = `test-not-sync-emails-unknown-change-me-${uuid()}`;

		await context.sdk.card.create({
			slug: `contact-${username}`,
			type: 'contact',
			data: {
				profile: {
					email: 'unknown@change.me',
				},
			},
		});

		const contact = await waitForContactWithMirror(username);

		expect(contact.data).toEqual({
			mirrors: contact.data.mirrors,
			profile: {
				email: 'unknown@change.me',
			},
		});

		expect(contact.data.mirrors.length).toBe(1);
		expect(
			contact.data.mirrors[0].startsWith(
				'https://api.outreach.io/api/v2/prospects/',
			),
		).toBe(true);
		const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
		const prospect = await context.getProspect(prospectId);

		expect(prospect.data.attributes.emails).toEqual([]);
		expect(prospect.data.attributes.name).toBe(username);
		expect(prospect.data.attributes.nickname).toBe(username);
		expect(prospect.data.attributes.githubUsername).toBeFalsy();
		expect(prospect.data.attributes.custom1).toBe(
			`https://jel.ly.fish/${contact.id}`,
		);
	},
);

conditionalTest('should sync tags', async () => {
	const username = `test-sync-tags-${uuid()}`;
	const email = `${username}@test.io`;
	const tags = ['foo'];

	await context.sdk.card.create({
		slug: `contact-${username}`,
		type: 'contact',
		data: {
			profile: {
				email,
			},
		},
		tags,
	});

	const contact = await waitForContactWithMirror(username);
	expect(contact.data).toEqual({
		mirrors: contact.data.mirrors,
		profile: {
			email,
		},
	});
	expect(contact.tags).toEqual(tags);

	expect(contact.data.mirrors.length).toBe(1);
	expect(
		contact.data.mirrors[0].startsWith(
			'https://api.outreach.io/api/v2/prospects/',
		),
	).toBe(true);
	const prospectId = _.parseInt(_.last(contact.data.mirrors[0].split('/'))!);
	const prospect = await context.getProspect(prospectId);

	expect(prospect.data.attributes.emails).toEqual([email]);
	expect(prospect.data.attributes.name).toBe(username);
	expect(prospect.data.attributes.nickname).toBe(username);
	expect(prospect.data.attributes.tags).toEqual(tags);
	expect(prospect.data.attributes.githubUsername).toBeFalsy();
	expect(prospect.data.attributes.custom1).toBe(
		`https://jel.ly.fish/${contact.id}`,
	);

	// Update the contact with a new tag
	tags.push('bar');
	await context.sdk.card.update(contact.id, contact.type, [
		{
			op: 'add',
			path: '/tags/1',
			value: tags[1],
		},
	]);
	await Bluebird.delay(3000);
	const updatedProspect = await context.getProspect(prospectId);
	expect(updatedProspect.data.attributes.tags).toEqual(tags);
});
