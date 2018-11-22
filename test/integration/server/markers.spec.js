/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const randomstring = require('randomstring')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

const users = {
	community: {
		username: `johndoe-${randomstring.generate().toLowerCase()}`,
		email: `johndoe-${randomstring.generate().toLowerCase()}@example.com`,
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

	await sdk.auth.signup(users.community)
	await sdk.auth.login(users.community)

	const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread',
		name: 'Test thread',
		version: '1.0.0'
	}))

	const userReadThread = await sdk.card.get(thread.id)

	test.deepEqual(thread, userReadThread)
})

ava.serial('Users should not be able to view an element that has a marker they don\'t have access to', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server

	const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread',
		name: 'Test entry',
		version: '1.0.0',
		markers: [ 'org-private' ]
	}))

	const userReadThread = await sdk.card.get(thread.id)

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

	const orgSlug = `org-balena-${randomstring.generate().toLowerCase()}`

	// Create the balena org
	const org = await sdk.card.create({
		type: 'org',
		slug: orgSlug,
		name: 'Balena',
		version: '1.0.0'
	})

	// Make the user a member of the org
	await sdk.card.link(user.id, org.id, 'is member of')

	await sdk.auth.login(users.community)

	const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread',
		name: 'Test entry',
		version: '1.0.0',
		markers: [ user.slug, orgSlug ]
	}))

	const userReadThread = await sdk.card.get(thread.id)

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

		const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
			slug: `thread-${randomstring.generate().toLowerCase()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ user.slug, 'org-balena' ]
		}))

		const userReadThread = await sdk.card.get(thread.id)

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

	const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread',
		name: 'Test entry',
		version: '1.0.0',
		markers: [ `${user.slug}+user-ash` ]
	}))

	const userReadThread = await sdk.card.get(thread.id)

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

		const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
			slug: `thread-${randomstring.generate().toLowerCase()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ `${user.slug}+user-ash`, 'org-private' ]
		}))

		const userReadThread = await sdk.card.get(thread.id)

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

		const orgSlug = `org-balena-${randomstring.generate().toLowerCase()}`

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		// Make the user a member of the org
		await sdk.card.link(user.id, org.id, 'is member of')

		await sdk.auth.login(users.community)

		const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
			slug: `thread-${randomstring.generate().toLowerCase()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ `${user.slug}+user-ash`, orgSlug ]
		}))

		const userReadThread = await sdk.card.get(thread.id)

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

	const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread',
		name: 'Test entry',
		version: '1.0.0',
		markers: [ `user-ash+${user.slug}+user-misty` ]
	}))

	const userReadThread = await sdk.card.get(thread.id)

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

		const orgSlug = `org-balena-${randomstring.generate().toLowerCase()}`

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		// Make the user a member of the org
		await sdk.card.link(user.id, org.id, 'is member of')

		await sdk.auth.login(users.community)

		const thread = await jellyfish.insertCard(test.context.session, jellyfish.defaults({
			slug: `thread-${randomstring.generate().toLowerCase()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ `${orgSlug}+org-private` ]
		}))

		const userReadThread = await sdk.card.get(thread.id)

		test.deepEqual(userReadThread, thread)
	})
