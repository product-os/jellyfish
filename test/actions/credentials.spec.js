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
const credentials = require('../../lib/actions/credentials')

ava.test('.hash() should pass if the password and salt matches', (test) => {
	const salt = 'user-foo'
	const hash = credentials.hash('foobarbaz', salt)
	test.is(credentials.hash('foobarbaz', salt), hash)
})

ava.test('.hash() should not pass if the password do not match', (test) => {
	const salt = 'user-foo'
	const hash = credentials.hash('foobarbaz', salt)
	test.not(credentials.hash('foobarqux', salt), hash)
})

ava.test('.hash() should not pass given a different salt', (test) => {
	const salt1 = 'user-foo'
	const salt2 = 'user-bar'
	const hash = credentials.hash('foobarbaz', salt1)
	test.not(credentials.hash('foobarbaz', salt2), hash)
})
