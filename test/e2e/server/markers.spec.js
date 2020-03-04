/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

ava.serial.before(async (test) => {
	await helpers.before(test)

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${users.community.username}`,
			email: users.community.email,
			password: users.community.password
		}
	})
})

ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('Users should be able to view an element with no markers', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.auth.login(users.community)

	const thread = await sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test thread'
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(thread, {
		id: userReadThread.id,
		type: userReadThread.type,
		version: userReadThread.version,
		slug: userReadThread.slug
	})
})

ava.serial('Users should not be able to view an element that has a marker they don\'t have access to', async (test) => {
	const {
		sdk
	} = test.context

	const orgSlug = `org-balena-${uuid()}`

	const org = await sdk.card.create({
		type: 'org',
		slug: orgSlug,
		name: 'Balena',
		version: '1.0.0'
	})

	await sdk.card.link(await sdk.auth.whoami(), org, 'is member of')

	const thread = await sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ orgSlug ]
	})

	const userDetails = createUserDetails()
	await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(users.community)

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(userReadThread, null)
})

ava.serial('Users should be able to view an element if all of their markers match', async (test) => {
	const {
		sdk
	} = test.context

	const orgSlug = `org-balena-${uuid()}`

	// Create the balena org
	const org = await sdk.card.create({
		type: 'org',
		slug: orgSlug,
		name: 'Balena',
		version: '1.0.0'
	})

	const user = await sdk.card.get(`user-${users.community.username}`)

	// Make the user a member of the org
	await sdk.card.link(user, org, 'is member of')

	await sdk.auth.login(users.community)

	const thread = await sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ user.slug, orgSlug ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(thread, {
		id: userReadThread.id,
		type: userReadThread.type,
		version: userReadThread.version,
		slug: userReadThread.slug
	})
})

ava.serial(
	'Users should only be able to view an element if they have access to every marker on the element',
	async (test) => {
		const {
			sdk
		} = test.context

		const whoami = await sdk.auth.whoami()
		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ whoami.slug, 'org-balena' ]
		})

		await sdk.auth.login(users.community)

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(userReadThread, null)
	})

ava.serial('Users should be able to view an element using compound markers', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.auth.login(users.community)
	const user = await sdk.auth.whoami()

	const thread = await sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ `${user.slug}+user-ash` ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(thread, {
		id: userReadThread.id,
		type: userReadThread.type,
		version: userReadThread.version,
		slug: userReadThread.slug
	})
})

ava.serial(
	'Users should not be able to view an element using compound markers if they don\'t have access to every marker',
	async (test) => {
		const {
			sdk
		} = test.context

		const orgSlug = `org-balena-${uuid()}`
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		await sdk.card.link(await sdk.auth.whoami(), org, 'is member of')

		const user = await sdk.card.get(`user-${environment.test.user.username}`)
		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ `${user.slug}+user-ash`, orgSlug ]
		})

		await sdk.auth.login(users.community)
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

		const orgSlug = `org-balena-${uuid()}`

		// Create the balena org
		const org = await sdk.card.create({
			type: 'org',
			slug: orgSlug,
			name: 'Balena',
			version: '1.0.0'
		})

		await sdk.card.link(await sdk.card.get(
			`user-${users.community.username}`), org, 'is member of')

		await sdk.auth.login(users.community)

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			version: '1.0.0',
			markers: [ `user-${users.community.username}+user-ash`, orgSlug ]
		})

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug
		})
	})

ava.serial('Users should be able to view an element using compound markers with more than two values', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.auth.login(users.community)
	const user = await sdk.auth.whoami()

	const thread = await sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread',
		name: 'Test entry',
		markers: [ `user-ash+${user.slug}+user-misty` ]
	})

	const userReadThread = await sdk.card.get(thread.id, {
		type: 'thread'
	})

	test.deepEqual(thread, {
		id: userReadThread.id,
		type: userReadThread.type,
		version: userReadThread.version,
		slug: userReadThread.slug
	})
})

ava.serial(
	'Users should be able to view an element using a compound marker that doesn\'t contain their personal marker',
	async (test) => {
		const {
			sdk
		} = test.context

		const user = await sdk.card.get(`user-${users.community.username}`)

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

		const thread = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread',
			name: 'Test entry',
			markers: [ `${orgSlug}+user-${environment.test.user.username}` ]
		})

		await sdk.auth.login(users.community)

		const userReadThread = await sdk.card.get(thread.id, {
			type: 'thread'
		})

		test.deepEqual(thread, {
			id: userReadThread.id,
			type: userReadThread.type,
			version: userReadThread.version,
			slug: userReadThread.slug
		})
	})

ava.serial('Updating a user should not remove their org membership', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const waitQuery = {
		type: 'object',
		$$links: {
			'is member of': {
				type: 'object',
				required: [ 'slug' ],
				properties: {
					slug: {
						type: 'string',
						const: 'org-balena'
					}
				}
			}
		},
		properties: {
			id: {
				type: 'string',
				const: user.id
			},
			type: {
				type: 'string',
				enum: [ 'user', 'user@1.0.0' ]
			}
		},
		required: [ 'id', 'type' ],
		additionalProperties: true
	}

	const balenaOrg = await sdk.card.get('org-balena', {
		type: 'org'
	})

	await test.context.executeThenWait(() => {
		return sdk.card.link(balenaOrg, user, 'has member')
	}, waitQuery)

	const linkedUser = await sdk.auth.whoami()

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: user.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/email',
						value: 'test@example.com'
					}
				]
			}
		}, {
			Authorization: `Bearer ${sdk.getAuthToken()}`
		})

	test.is(result.code, 200)
	test.false(result.response.error)

	const updatedUser = await sdk.auth.whoami()

	test.deepEqual(updatedUser.links['is member of'], linkedUser.links['is member of'])
})

ava.serial('.query() should be able to see previously restricted cards after an org change', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const orgCard = await sdk.card.get('org-balena')
	const entry = await sdk.card.create({
		markers: [ orgCard.slug ],
		type: 'support-issue',
		slug: test.context.generateRandomSlug({
			prefix: 'support-issue'
		}),
		version: '1.0.0',
		name: 'Test entry'
	})

	await sdk.auth.login(userDetails)
	const unprivilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.deepEqual(unprivilegedResults, null)

	sdk.setAuthToken(test.context.token)
	await sdk.card.link(orgCard, user, 'has member')
	await sdk.auth.login(userDetails)

	const privilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.truthy(privilegedResults)
	test.deepEqual(privilegedResults.id, entry.id)
})
