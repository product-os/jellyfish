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
const actionLibrary = require('../../lib/action-library')
const httpRequest = actionLibrary['action-http-request']
const helpers = require('./helpers')

ava.test.beforeEach(helpers.beforeEach)
ava.test.afterEach(helpers.afterEach)

const testUrl = async (url) => {
	const options = {
		arguments: {
			url
		}
	}
	return httpRequest(null, null, null, options)
}

const apiTest = helpers.domains.api
ava.test(
	[
		`'${apiTest.domain}${apiTest.path}'`,
		'should resolve using action-http-request function'
	].join(' '),
	async (test) => {
		test.deepEqual(
			await testUrl(`${apiTest.domain}${apiTest.path}`),
			apiTest.body
		)
	}
)
ava.test(
	[
		`'${apiTest.domain}${apiTest.path}'`,
		'should resolve using action-http-request card'
	].join(' '),
	async (test) => {
		const actionCard = await test.context.jellyfish.getCardBySlug(
			test.context.session,
			'action-http-request'
		)
		const requestId = await test.context.worker.enqueue(
			test.context.session,
			{
				action: 'action-http-request',
				card: actionCard.id,
				arguments: {
					body: {},
					method: 'GET',
					url: `${apiTest.domain}${apiTest.path}`
				}
			}
		)
		await test.context.flush(test.context.session)
		const requestResult = await test.context.worker.waitResults(
			test.context.session,
			requestId
		)
		test.false(requestResult.error)
	}
)

const duffTest = helpers.domains.duff
ava.test(
	[
		`'${duffTest.domain}'`,
		'should reject using action-http-request function'
	].join(' '),
	async (test) => {
		await test.throws(
			testUrl(duffTest.domain),
			null,
			/^Error: Invalid URI/
		)
	}
)

const errTest = helpers.domains.err
ava.test(
	[
		`'${errTest.domain}${errTest.path}'`,
		'should reject using action-http-request function'
	].join(' '),
	async (test) => {
		await test.throws(
			testUrl(`${errTest.domain}${errTest.domain}`),
			null,
			new RegExp(`^${errTest.status}`)
		)
	}
)
