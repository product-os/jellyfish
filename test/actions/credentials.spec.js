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

ava.test('.check() should return true if the password and salt matches', (test) => {
	const salt = 'user-foo'
	const hash = credentials.hash('foobarbaz', salt)
	test.true(credentials.check('foobarbaz', {
		hash,
		salt
	}))
})

ava.test('.check() should return false if the password do not match', (test) => {
	const salt = 'user-foo'
	const hash = credentials.hash('foobarbaz', salt)
	test.false(credentials.check('foobarqux', {
		hash,
		salt
	}))
})

ava.test('.check() should return false given a different salt', (test) => {
	const salt1 = 'user-foo'
	const salt2 = 'user-bar'
	const hash = credentials.hash('foobarbaz', salt1)
	test.false(credentials.check('foobarbaz', {
		salt: salt2,
		hash
	}))
})
