/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('./helpers')

// TODO: Possibly move this file to test/integration/sdk if/when
// we resolve where to place sdk helper methods that are used by
// both e2e tests and integration tests.

const context = {
	context: {
		id: `SDK-CARD-E2E-TEST-${uuid()}`
	}
}

const createSupportThread = async (sdk) => {
	return sdk.card.create({
		type: 'support-thread',
		data: {
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})
}

const createSupportIssue = async (sdk) => {
	return sdk.card.create({
		type: 'support-issue',
		name: `test-support-issue-${uuid()}`,
		data: {
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})
}

ava.before(async () => {
	await helpers.before({
		context
	})
})

ava.after(async () => {
	await helpers.after({
		context
	})
})

ava.beforeEach(async () => {
	await helpers.beforeEach({
		context
	})
})

ava.afterEach(async () => {
	await helpers.afterEach({
		context
	})
})

ava('If you call card.link twice with the same params you will get the same link card back', async (test) => {
	const {
		sdk
	} = context

	// Create a support thread and support issue
	const supportThread = await createSupportThread(sdk)

	const supportIssue = await createSupportIssue(sdk)

	// Link the support thread to the support issue
	const link1 = await sdk.card.link(supportThread, supportIssue, 'support thread is attached to support issue')

	// Try to link the same support thread to the same support issue
	const link2 = await sdk.card.link(supportThread, supportIssue, 'support thread is attached to support issue')

	// Verify the link ID is the same
	test.is(link1.id, link2.id)
})

ava('card.link will create a new link if the previous one was deleted', async (test) => {
	const {
		sdk
	} = context

	// Create a support thread and support issue
	const supportThread = await createSupportThread(sdk)

	const supportIssue = await createSupportIssue(sdk)

	// Link the support thread to the support issue
	const link1 = await sdk.card.link(supportThread, supportIssue, 'support thread is attached to support issue')

	// Now remove the link
	await sdk.card.unlink(supportThread, supportIssue, 'support thread is attached to support issue')

	// Try to link the same support thread to the same support issue
	const link2 = await sdk.card.link(supportThread, supportIssue, 'support thread is attached to support issue')

	// Verify the link ID is not the same
	test.not(link1.id, link2.id)
})
