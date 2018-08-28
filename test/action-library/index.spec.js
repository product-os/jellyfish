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
const domainHelper = require('./domain-helper')

ava.test.beforeEach(domainHelper.nock)

const testUrl = async (url) => {
	const options = {
		arguments: {
			url
		}
	}
	return httpRequest(null, null, null, options)
}

const apiTest = domainHelper.examples.api
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

const duffTest = domainHelper.examples.duff
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

const errTest = domainHelper.examples.err
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
