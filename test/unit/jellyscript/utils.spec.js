/*
 * Copyright 2017 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const _ = require('lodash')
const utils = require('../../../lib/jellyscript/utils')

ava.test('.hashObject() should return a string', (test) => {
	test.true(_.isString(utils.hashObject({
		foo: 'bar'
	})))
})

ava.test('.hashObject() should not care about properties order', (test) => {
	const hash1 = utils.hashObject({
		foo: 'bar',
		bar: 'baz'
	})

	const hash2 = utils.hashObject({
		bar: 'baz',
		foo: 'bar'
	})

	test.deepEqual(hash1, hash2)
})

ava.test('.hashObject() should not rely on object references', (test) => {
	const object = {
		foo: 'bar'
	}

	const hash1 = utils.hashObject(_.cloneDeep(object))
	const hash2 = utils.hashObject(_.cloneDeep(object))
	const hash3 = utils.hashObject(_.cloneDeep(object))

	test.deepEqual(hash1, hash2)
	test.deepEqual(hash2, hash3)
	test.deepEqual(hash3, hash1)
})

ava.test('.hashObject() should return different hashes for different objects', (test) => {
	const hash1 = utils.hashObject({
		foo: 'bar'
	})

	const hash2 = utils.hashObject({
		foo: 'baz'
	})

	const hash3 = utils.hashObject({
		foo: 'qux'
	})

	test.notDeepEqual(hash1, hash2)
	test.notDeepEqual(hash2, hash3)
	test.notDeepEqual(hash3, hash1)
})
