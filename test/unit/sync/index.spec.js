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
