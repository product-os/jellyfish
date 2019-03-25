/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

ava.serial('Users should be able to view an element with no markers', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	await test.context.createUser(users.community)
	await sdk.auth.login(users.community)

	const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test thread'
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(thread, userReadThread)
})

ava.serial('Users should not be able to view an element that has a marker they don\'t have access to', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ 'org-private' ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(userReadThread, null)
})

ava.serial('Users should be able to view an element if all of their markers match', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	await sdk.auth.login(users.community)
	const user = await sdk.auth.whoami()

	// Sign in as the admin
	await sdk.setAuthToken(test.context.session)

	const orgSlug = `org-balena-${uuid()}`

	// Create the balena org
	const org = await sdk.card.create({
		type: 'org',
		slug: orgSlug,
		name: 'Balena',
		version: '1.0.0'
	})

	// Make the user a member of the org
	await sdk.card.link(user, org, 'is member of')

	await sdk.auth.login(users.community)

	const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ user.slug, orgSlug ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(userReadThread, thread)
})

ava.serial(
	'Users should only be able to view an element if they have access to every marker on the element',
	async (test) => {
		const {
			sdk
		} = test.context
		const {
			jellyfish
		} = test.context.server

		await sdk.auth.login(users.community)
		const user = await sdk.auth.whoami()

		const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ user.slug, 'org-balena' ]
		})

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(userReadThread, null)
	})

ava.serial('Users should be able to view an element using compound markers', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	await sdk.auth.login(users.community)
	const user = await sdk.auth.whoami()

	const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ `${user.slug}+user-ash` ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(userReadThread, thread)
})

ava.serial(
	'Users should not be able to view an element using compound markers if they don\'t have access to every marker',
	async (test) => {
		const {
			sdk
		} = test.context
		const {
			jellyfish
		} = test.context.server

		await sdk.auth.login(users.community)
		const user = await sdk.auth.whoami()

		// Sign in as the admin
		await sdk.setAuthToken(test.context.session)

		await sdk.auth.login(users.community)

		const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ `${user.slug}+user-ash`, 'org-private' ]
		})

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(userReadThread, null)
	})

ava.serial(
	'Users should be able to view an element using compound markers if they have access to every marker',
	async (test) => {
		const {
			sdk
		} = test.context
		const {
			jellyfish
		} = test.context.server

		await sdk.auth.login(users.community)
		const user = await sdk.auth.whoami()

		// Sign in as the admin
		await sdk.setAuthToken(test.context.session)

		const orgSlug = `org-balena-${uuid()}`

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		// Make the user a member of the org
		await sdk.card.link(user, org, 'is member of')

		await sdk.auth.login(users.community)

		const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ `${user.slug}+user-ash`, orgSlug ]
		})

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(userReadThread, thread)
	})

ava.serial('Users should be able to view an element using compound markers with more than two values', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	await sdk.auth.login(users.community)
	const user = await sdk.auth.whoami()

	const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ `user-ash+${user.slug}+user-misty` ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(userReadThread, thread)
})

ava.serial(
	'Users should be able to view an element using a compound marker that doesn\'t contain their personal marker',
	async (test) => {
		const {
			sdk
		} = test.context
		const {
			jellyfish
		} = test.context.server

		await sdk.auth.login(users.community)
		const user = await sdk.auth.whoami()

		// Sign in as the admin
		await sdk.setAuthToken(test.context.session)

		const orgSlug = `org-balena-${uuid()}`

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		// Make the user a member of the org
		await sdk.card.link(user, org, 'is member of')

		await sdk.auth.login(users.community)

		const thread = await jellyfish.insertCard(test.context.context, test.context.session, {
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ `${orgSlug}+org-private` ]
		})

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(userReadThread, thread)
	})
