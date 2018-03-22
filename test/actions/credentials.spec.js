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

ava.test('.check() should return true if the password matches', (test) => {
	const hash = credentials.hash('foobarbaz')
	test.true(credentials.check('foobarbaz', hash))
})

ava.test('.check() should return false if the password does not match', (test) => {
	const hash = credentials.hash('foobarbaz')
	test.false(credentials.check('foobarqux', hash))
})
