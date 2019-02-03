/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const utils = require('../../../lib/jellyscript/utils')

ava('.hashObject() should return a string', (test) => {
	test.true(_.isString(utils.hashObject({
		foo: 'bar'
	})))
})

ava('.hashObject() should not care about properties order', (test) => {
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

ava('.hashObject() should not rely on object references', (test) => {
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

ava('.hashObject() should return different hashes for different objects', (test) => {
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
