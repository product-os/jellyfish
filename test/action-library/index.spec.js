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
const actions = require('../../lib/action-library')
const Bluebird = require('bluebird')
const _ = require('lodash')

const isRejected = 'rejected'
const isResolved = 'resolved'

const urlTest = async (urls) => {
	return Bluebird.map(urls, (url) => {
		const request = {
			arguments: {
				url
			}
		}
		return actions['action-http-request'](null, null, null, request)
			.then(_.constant(isResolved))
			.catch(_.constant(isRejected))
	})
}

ava.test('.action-http-request() should retrieve some valid urls', async (test) => {
	const urls = [
		'http://www.example.com'
	]
	const expectations = _.fill(_.clone(urls), isResolved)
	const results = await urlTest(urls)
	test.deepEqual(results, expectations)
})

ava.test('.action-http-request() should reject some invalid urls', async (test) => {
	const urls = [
		'duff',
		'http://www.error.com/',
		'https://www.example.com/duff.html'
	]
	const expectations = _.fill(_.clone(urls), isRejected)
	const results = await urlTest(urls)
	test.deepEqual(results, expectations)
})
