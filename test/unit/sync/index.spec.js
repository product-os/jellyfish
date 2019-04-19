/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const sync = require('../../../lib/sync')

ava('.isValidExternalEventRequest() should return true for Front given anything', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxxxx'
	}, 'front', '....', {})
	test.true(result)
})

ava('.isValidExternalEventRequest() should return false for an unknown integration', async (test) => {
	const result = sync.isValidExternalEventRequest(
		null, 'helloworld', '....', {})
	test.false(result)
})

ava('.isValidExternalEventRequest() should return true given GitHub and no signature header', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '....', {})
	test.true(result)
})

ava('.isValidExternalEventRequest() should return false given GitHub and a signature but no key', async (test) => {
	const result = sync.isValidExternalEventRequest(null, 'github', '....', {
		'x-hub-signature': 'sha1=aaaabbbbcccc'
	})

	test.false(result)
})

ava('.isValidExternalEventRequest() should return false given GitHub and a signature mismatch', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '{"foo":"bar"}', {
		'x-hub-signature': 'sha1=foobarbaz'
	})

	test.false(result)
})

ava('.isValidExternalEventRequest() should return true given GitHub and a signature match', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '{"foo":"bar"}', {
		'x-hub-signature': 'sha1=52b582138706ac0c597c315cfc1a1bf177408a4d'
	})

	test.true(result)
})

ava('.isValidExternalEventRequest() should return true given Discourse and no signature header', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '....', {})
	test.true(result)
})

ava('.isValidExternalEventRequest() should return false given Discourse and a signature but no key', async (test) => {
	const result = sync.isValidExternalEventRequest(null, 'discourse', '....', {
		'x-discourse-event-signature': 'sha256=aaaabbbbcccc'
	})

	test.false(result)
})

ava('.isValidExternalEventRequest() should return false given Discourse and a signature mismatch', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '{"foo":"bar"}', {
		'x-discourse-event-signature': 'sha256=foobarbaz'
	})

	test.false(result)
})

ava('.isValidExternalEventRequest() should return true given Discourse and a signature match', async (test) => {
	const result = sync.isValidExternalEventRequest({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '{"foo":"bar"}', {
		'x-discourse-event-signature': 'sha256=3f3ab3986b656abb17af3eb1443ed6c08ef8fff9fea83915909d1b421aec89be'
	})

	test.true(result)
})
