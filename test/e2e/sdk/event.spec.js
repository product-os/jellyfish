/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const moment = require('moment')
const helpers = require('./helpers')

// TODO: Possibly move this file to test/integration/sdk if/when
// we resolve where to place sdk helper methods that are used by
// both e2e tests and integration tests.

const context = {
	context: {
		id: `SDK-EVENT-E2E-TEST-${uuid()}`
	}
}

const createSupportThread = async (sdk) => {
	return sdk.card.create({
		type: 'support-thread@1.0.0',
		data: {
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})
}

const createMessage = async (sdk, target, payload) => {
	const msg = await sdk.event.create({
		type: 'message',
		tags: [],
		target,
		payload
	})
	return sdk.card.get(msg.id)
}

ava.before(async () => {
	await helpers.before({
		context
	})

	// Create a support thread and support issue
	context.supportThread = await createSupportThread(context.sdk)
})

ava.after.always(async () => {
	await helpers.after({
		context
	})
})

ava.beforeEach(async () => {
	await helpers.beforeEach({
		context
	})
})

ava.afterEach.always(async () => {
	await helpers.afterEach({
		context
	})
})

ava('Editing a message triggers an update to the edited_at field', async (test) => {
	const {
		sdk,
		supportThread
	} = context
	const messageBefore = 'Before'
	const update1 = 'update 1'
	const update2 = 'update 2'

	let msg = await createMessage(sdk, supportThread, {
		message: messageBefore
	})

	// Verify that initiall the edited_at field is undefined
	test.is(typeof msg.data.edited_at, 'undefined')

	// Now update the message text
	await sdk.card.update(msg.id, msg.type, [ {
		op: 'replace',
		path: '/data/payload/message',
		value: update1
	} ])
	msg = await sdk.card.get(msg.id)

	// And check that the edited_at field now has a valid date-time value
	const firstEditedAt = moment(msg.data.edited_at)
	test.true(firstEditedAt.isValid())
	test.is(msg.data.payload.message, update1)

	// Now modify the message text again
	await sdk.card.update(msg.id, msg.type, [ {
		op: 'replace',
		path: '/data/payload/message',
		value: update2
	} ])
	msg = await sdk.card.get(msg.id)

	// And check that the edited_at field has been updated again
	const secondEditedAt = moment(msg.data.edited_at)
	test.true(firstEditedAt.isValid())
	test.is(msg.data.payload.message, update2)

	test.true(firstEditedAt.isBefore(secondEditedAt))
})

ava('Updating a meta field in the message payload triggers an update to the edited_at field', async (test) => {
	const {
		sdk,
		supportThread
	} = context
	const mentionsUserBefore = []
	const user1 = 'user-1'

	let msg = await createMessage(sdk, supportThread, {
		message: 'test',
		mentionsUser: mentionsUserBefore
	})

	// Verify that initiall the edited_at field is undefined
	test.is(typeof msg.data.edited_at, 'undefined')

	// Now add a mentionsUser item
	await sdk.card.update(msg.id, msg.type, [ {
		op: 'add',
		path: '/data/payload/mentionsUser/0',
		value: user1
	} ])
	msg = await sdk.card.get(msg.id)

	// And check that the edited_at field now has a valid date-time value
	const firstEditedAt = moment(msg.data.edited_at)
	test.true(firstEditedAt.isValid())
	test.deepEqual(msg.data.payload.mentionsUser, [ user1 ])

	// Now remove the mentioned user
	await sdk.card.update(msg.id, msg.type, [ {
		op: 'remove',
		path: '/data/payload/mentionsUser/0'
	} ])
	msg = await sdk.card.get(msg.id)

	// And check that the edited_at field has been updated again
	const secondEditedAt = moment(msg.data.edited_at)
	test.true(firstEditedAt.isValid())
	test.deepEqual(msg.data.payload.mentionsUser, [ ])

	test.true(firstEditedAt.isBefore(secondEditedAt))
})
