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
const password = require('../../lib/sdk/password')

ava.test('.check() should return true if the password matches', async (test) => {
	const result = await password.hash('foobarbaz')
	test.true(await password.check('foobarbaz', result))
})

ava.test('.check() should return false if the password do not match', async (test) => {
	const result = await password.hash('foobarbaz')
	test.false(await password.check('foobarqux', result))
})

ava.test('.check() should return false given a different salt', async (test) => {
	const result = await password.hash('foobarbaz')
	result.salt = 'xxxxxxxxxxxxxxxxxxxx'
	test.false(await password.check('foobarbaz', result))
})
