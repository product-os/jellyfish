/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
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

const createUser = async (test, org, role, details) => {
	// Create user
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${details.username}`,
			email: details.email,
			password: details.password
		}
	})

	// Set user role
	await test.context.sdk.card.update(
		user.id,
		user.type,
		[
			{
				op: 'replace',
				path: '/data/roles/0',
				value: role
			}
		]
	)

	// Make the user a member of the org
	await test.context.sdk.card.link(user, org, 'is member of')

	return user
}

const createOrg = async (test) => {
	const uniqueId = uuid()
	return test.context.sdk.card.create({
		type: 'org',
		slug: `org-${uniqueId}`,
		name: `Org ${uniqueId}`,
		version: '1.0.0'
	})
}

ava.serial(`external support users should not be able to crete threads with product and inbox values
other then balenaCloud and S/Paid_Support respectively`,
async (test) => {
	const {
		sdk
	} = test.context

	// Get balena org
	const balenaOrg = await sdk.card.get('org-balena')

	// Create balena organisation user
	const externalSupportUserDetails = createUserDetails()
	const externalSupportUser = await createUser(test, balenaOrg, 'user-external-support', externalSupportUserDetails)

	// Logout from current user
	await sdk.auth.logout()

	// Login with user
	await sdk.auth.login(externalSupportUserDetails)

	// Create thread with different product
	let error = await test.throwsAsync(test.context.sdk.card.create({
		type: 'support-thread',
		name: 'test subject',
		markers: [ `${externalSupportUser.slug}+org-balena` ],
		data: {
			product: 'test-product',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	}))

	test.is(error.name, 'JellyfishPermissionsError')

	// Create thread with different inbox
	error = await test.throwsAsync(test.context.sdk.card.create({
		type: 'support-thread',
		name: 'test subject',
		markers: [ `${externalSupportUser.slug}+org-balena` ],
		data: {
			product: 'balenaCloud',
			inbox: 'S/TestInbox',
			status: 'open'
		}
	}))

	test.is(error.name, 'JellyfishPermissionsError')
})

ava.serial('the message sent by external support user should be only visible for balena organisation users', async (test) => {
	const {
		sdk
	} = test.context

	// Create org
	const org = await createOrg(test)

	// Create user 1
	const user1Details = createUserDetails()
	const user1 = await createUser(test, org, 'user-external-support', user1Details)

	// Create user 2
	const user2Details = createUserDetails()
	await createUser(test, org, 'user-external-support', user2Details)

	// Get balena org
	const balenaOrg = await sdk.card.get('org-balena')

	// Create balena organisation user
	const balenaOrgUserDetails = createUserDetails()
	await createUser(test, balenaOrg, 'user-community', balenaOrgUserDetails)

	// Logout from current user
	await sdk.auth.logout()

	// Login with user 1
	await sdk.auth.login(user1Details)

	// Create thread on behalf of user1
	const thread = await test.context.sdk.card.create({
		type: 'support-thread',
		name: 'test subject',
		markers: [ `${user1.slug}+org-balena` ],
		data: {
			product: 'balenaCloud',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	// Create message on behalf of user 1
	const message = await test.context.sdk.event.create({
		target: thread,
		type: 'message',
		slug: `message-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: 'test message'
		}
	})

	// Logout from user1
	await sdk.auth.logout()

	// Login with user 2
	await sdk.auth.login(user2Details)

	// Get user1 thread
	test.is(await sdk.card.get(thread.id), null)

	// Get user1 message
	test.is(await sdk.card.get(message.id), null)

	// Logout from user2
	await sdk.auth.logout()

	// Login with balena organisation user
	await sdk.auth.login(balenaOrgUserDetails)

	// Get user1 thread
	test.is((await sdk.card.get(thread.id)).id, thread.id)

	// Get user1 message
	test.is((await sdk.card.get(message.id)).id, message.id)
})

ava.serial(
	'external support user should not be able to create a thread with markers other then <user.slug>+org-balena',
	async (test) => {
		const {
			sdk
		} = test.context

		// Create org
		const org = await createOrg(test)

		// Create external support user
		const externalSupportUserDetails = createUserDetails()
		const externalSupportUser = await createUser(test, org, 'user-external-support', externalSupportUserDetails)

		// Logout from current user
		await sdk.auth.logout()

		// Login with external support user
		await sdk.auth.login(externalSupportUserDetails)

		// Create thread on behalf of external support user with org other then org-balena
		let error = await test.throwsAsync(test.context.sdk.card.create({
			type: 'support-thread',
			name: 'test subject',
			markers: [ `${externalSupportUser.slug}+org-other` ],
			data: {
				product: 'balenaCloud',
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		}))

		test.is(error.name, 'JellyfishPermissionsError')

		// Create thread on behalf of external support user without markers
		error = await test.throwsAsync(test.context.sdk.card.create({
			type: 'support-thread',
			name: 'test subject',
			markers: [],
			data: {
				product: 'balenaCloud',
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		}))

		test.is(error.name, 'JellyfishPermissionsError')
	}
)

ava.serial('external support user should not be able to view other card types', async (test) => {
	const {
		sdk
	} = test.context

	// Create org
	const org = await createOrg(test)

	// Create external support user
	const externalSupportUserDetails = createUserDetails()
	await createUser(test, org, 'user-external-support', externalSupportUserDetails)

	// Logout from current user
	await sdk.auth.logout()

	// Login with external support user
	await sdk.auth.login(externalSupportUserDetails)

	// Get available types
	const types = (await sdk.card.getAllByType('type')).map((typeCard) => {
		return typeCard.slug
	}).sort()

	test.deepEqual([ 'card', 'link', 'message', 'support-thread' ], types)
})
