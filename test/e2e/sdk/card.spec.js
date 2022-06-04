const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')

let sdk = {}

// TODO: Possibly move this file to test/integration/sdk if/when
// we resolve where to place sdk helper methods that are used by
// both e2e tests and integration tests.

const createSupportThread = async () => {
	return sdk.card.create({
		type: 'support-thread@1.0.0',
		data: {
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})
}

const createIssue = async () => {
	return sdk.card.create({
		type: 'issue@1.0.0',
		name: `test-issue-${uuid()}`,
		data: {
			inbox: 'S/Paid_Support',
			status: 'open',
			repository: 'foobar'
		}
	})
}

ava.before(async () => {
	sdk = await helpers.login()
})

ava.afterEach.always(async () => {
	await helpers.afterEach(sdk)
})

ava('If you call card.link twice with the same params you will get the same link card back', async (test) => {
	// Create a support thread and support issue
	const supportThread = await createSupportThread()

	const issue = await createIssue()

	// Link the support thread to the issue
	await sdk.card.link(supportThread, issue, 'is attached to')

	// Try to link the same support thread to the same issue
	const link = await sdk.card.link(supportThread, issue, 'is attached to')

	// Verify the link ID is the same
	test.is(link, true)
})

ava('card.link will create a new link if the previous one was deleted', async (test) => {
	// Create a support thread and issue
	const supportThread = await createSupportThread()

	const issue = await createIssue()

	// Link the support thread to the issue
	const link1 = await sdk.card.link(supportThread, issue, 'is attached to')

	// Now remove the link
	await sdk.card.unlink(supportThread, issue, 'is attached to')

	// Try to link the same support thread to the same issue
	const link2 = await sdk.card.link(supportThread, issue, 'is attached to')

	// Verify the link ID is not the same
	test.not(link1.id, link2.id)
})
