/*
 * Copyright 2019 resin.io
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
const Queue = require('../../../lib/queue')
const helpers = require('./helpers')

ava.beforeEach(async (test) => {
	await helpers.jellyfish.beforeEach(test)
	test.context.queue = new Queue(
		test.context.context,
		test.context.jellyfish,
		test.context.session)
})

ava.afterEach(helpers.jellyfish.afterEach)

ava('.length() should be zero by default', async (test) => {
	const length = await test.context.queue.length()
	test.is(length, 0)
})
