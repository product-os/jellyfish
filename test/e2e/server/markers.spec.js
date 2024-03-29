const environment = require('@balena/jellyfish-environment').defaultEnvironment;
const ava = require('ava');
const { v4: uuid } = require('uuid');
const sdkHelpers = require('../sdk/helpers');
const helpers = require('./helpers');

let sdk = {};
const users = {
	community: helpers.generateUserDetails(),
};

ava.serial.before(async (test) => {
	sdk = await sdkHelpers.login();

	await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${users.community.username}`,
			email: users.community.email,
			password: users.community.password,
		},
	});
});

ava.serial.beforeEach(async () => {
	const session = await sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password,
	});
	sdk.setAuthToken(session.id);
});

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk);
});

ava.serial(
	'Users should be able to view an element with no markers',
	async (test) => {
		await sdk.auth.login(users.community);

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test thread',
		});

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	"Users should not be able to view an element that has a marker they don't have access to",
	async (test) => {
		const orgSlug = `org-balena-${uuid()}`;

		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0',
		});

		await sdk.card.link(await sdk.auth.whoami(), org, 'is member of');

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [orgSlug],
		});

		const userDetails = helpers.generateUserDetails();
		await sdk.action({
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				username: `user-${userDetails.username}`,
				email: userDetails.email,
				password: userDetails.password,
			},
		});

		await sdk.auth.login(users.community);

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(userReadThread, null);
	},
);

ava.serial(
	'Users should be able to view an element if all of their markers match',
	async (test) => {
		const orgSlug = `org-balena-${uuid()}`;

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0',
		});

		const user = await sdk.card.get(`user-${users.community.username}`);

		// Make the user a member of the org
		await sdk.card.link(user, org, 'is member of');

		await sdk.auth.login(users.community);

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [user.slug, orgSlug],
		});

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	'Users should only be able to view an element if they have access to every marker on the element',
	async (test) => {
		const whoami = await sdk.auth.whoami();
		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [whoami.slug, 'org-balena'],
		});

		await sdk.auth.login(users.community);

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(userReadThread, null);
	},
);

ava.serial(
	'Users should be able to view an element using compound markers',
	async (test) => {
		await sdk.auth.login(users.community);
		const user = await sdk.auth.whoami();

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [`${user.slug}+user-ash`],
		});

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	"Users should not be able to view an element using compound markers if they don't have access to every marker",
	async (test) => {
		const orgSlug = `org-balena-${uuid()}`;
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0',
		});

		await sdk.card.link(await sdk.auth.whoami(), org, 'is member of');

		const user = await sdk.card.get(`user-${environment.test.user.username}`);
		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [`${user.slug}+user-ash`, orgSlug],
		});

		await sdk.auth.login(users.community);
		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(userReadThread, null);
	},
);

ava.serial(
	'Users should be able to view an element using compound markers if they have access to every marker',
	async (test) => {
		const orgSlug = `org-balena-${uuid()}`;

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0',
		});

		await sdk.card.link(
			await sdk.card.get(`user-${users.community.username}`),
			org,
			'is member of',
		);

		await sdk.auth.login(users.community);

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [`user-${users.community.username}+user-ash`, orgSlug],
		});

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	'Users should be able to view an element using compound markers with more than two values',
	async (test) => {
		await sdk.auth.login(users.community);
		const user = await sdk.auth.whoami();

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [`user-ash+${user.slug}+user-misty`],
		});

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	"Users should be able to view an element using a compound marker that doesn't contain their personal marker",
	async (test) => {
		const user = await sdk.card.get(`user-${users.community.username}`);

		const orgSlug = `org-balena-${uuid()}`;

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0',
		});

		// Make the user a member of the org
		await sdk.card.link(user, org, 'is member of');

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [`${orgSlug}+user-${environment.test.user.username}`],
		});

		await sdk.auth.login(users.community);

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread',
		});

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug,
		});
	},
);

ava.serial(
	'Updating a user should not remove their org membership',
	async (test) => {
		const userDetails = helpers.generateUserDetails();
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

		await sdk.auth.login(userDetails);

		await sdk.card.create({
			type: 'org',
			slug: `org-balena-${uuid()}`,
			name: 'Balena',
			version: '1.0.0',
		});

		const linkedUser = await sdk.auth.whoami();

		const result = await helpers.http(
			'POST',
			'/api/v2/action',
			{
				card: `${user.slug}@${user.version}`,
				type: user.type,
				action: 'action-update-card@1.0.0',
				arguments: {
					reason: null,
					patch: [
						{
							op: 'replace',
							path: '/data/email',
							value: 'test@example.com',
						},
					],
				},
			},
			{
				Authorization: `Bearer ${sdk.getAuthToken()}`,
			},
		);

		test.is(result.code, 200);
		test.false(result.response.error);

		const updatedUser = await sdk.auth.whoami();

		test.deepEqual(
			updatedUser.links['is member of'],
			linkedUser.links['is member of'],
		);
	},
);

ava.serial(
	'.query() should be able to see previously restricted cards after an org change',
	async (test) => {
		const token = sdk.getAuthToken();
		const userDetails = helpers.generateUserDetails();
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

		const orgCard = await sdk.card.get('org-balena');
		const entry = await sdk.card.create({
			markers: [orgCard.slug],
			type: 'thread',
			slug: helpers.generateRandomSlug({
				prefix: 'thread',
			}),
			version: '1.0.0',
			name: 'Test entry',
		});

		await sdk.auth.login(userDetails);
		const unprivilegedResults = await sdk.card.get(entry.id, {
			type: 'thread',
		});

		test.deepEqual(unprivilegedResults, null);

		sdk.setAuthToken(token);
		await sdk.card.link(orgCard, user, 'has member');
		await sdk.auth.login(userDetails);

		const privilegedResults = await sdk.card.get(entry.id, {
			type: 'thread',
		});

		test.truthy(privilegedResults);
		test.deepEqual(privilegedResults.id, entry.id);
	},
);
