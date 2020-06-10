/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const payload = require(
	'../../../../../../lib/core/backend/postgres/pg-live-select/payload')

const ID_LEN = 20
const SEPARATOR = ':'

ava('.parse() should parse a simple object', (test) => {
	const buffer = Buffer.from('{"foo":"bar"}')
	const data = `aaaaaaaaaaaaaaaaaaaa1:1:${buffer.toString('base64')}`
	const result = payload.parse(data, ID_LEN, SEPARATOR)
	test.deepEqual(result, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 1,
		currentPage: 1,
		message: buffer
	})
})

ava('.parse() should parse an incomplete object', (test) => {
	const buffer = Buffer.from('{"foo":"bar","baz":')
	const data = `aaaaaaaaaaaaaaaaaaaa1:1:${buffer.toString('base64')}`
	const result = payload.parse(data, ID_LEN, SEPARATOR)
	test.deepEqual(result, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 1,
		currentPage: 1,
		message: buffer
	})
})

ava('.parse() should a chunk of a bigger message', (test) => {
	const buffer = Buffer.from('{"foo":"bar"}')
	const data = `aaaaaaaaaaaaaaaaaaaa3:2:${buffer.toString('base64')}`
	const result = payload.parse(data, ID_LEN, SEPARATOR)
	test.deepEqual(result, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 3,
		currentPage: 2,
		message: buffer
	})
})

ava('.reconstruct() should reconstruct a one page simple object', (test) => {
	const buffer = Buffer.from('{"after":{"foo":"bar"}}')
	const cache = {}
	const result = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 1,
		currentPage: 1,
		message: buffer
	})

	test.deepEqual(cache, {})
	test.deepEqual(result, {
		before: null,
		after: {
			foo: 'bar'
		}
	})
})

ava('.reconstruct() should store a partial chunk', (test) => {
	const buffer = Buffer.from('{"after":{"foo"')
	const cache = {}
	const result = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 2,
		currentPage: 1,
		message: buffer
	})

	test.deepEqual(cache, {
		aaaaaaaaaaaaaaaaaaaa: {
			slices: [ buffer, null ],
			pendingPages: 1
		}
	})

	test.deepEqual(result, null)
})

ava('.reconstruct() should re-assemble a two parts message', (test) => {
	const cache = {}

	const result1 = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 2,
		currentPage: 1,
		message: Buffer.from('{"after":{"foo"')
	})

	const result2 = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 2,
		currentPage: 2,
		message: Buffer.from(':"bar"}}')
	})

	test.deepEqual(cache, {})
	test.deepEqual(result1, null)
	test.deepEqual(result2, {
		before: null,
		after: {
			foo: 'bar'
		}
	})
})

ava('.reconstruct() should re-assemble an out of order two parts message', (test) => {
	const cache = {}

	const result1 = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 2,
		currentPage: 2,
		message: Buffer.from(':"bar"}}')
	})

	const result2 = payload.reconstruct(cache, {
		identity: 'aaaaaaaaaaaaaaaaaaaa',
		totalPages: 2,
		currentPage: 1,
		message: Buffer.from('{"after":{"foo"')
	})

	test.deepEqual(cache, {})
	test.deepEqual(result1, null)
	test.deepEqual(result2, {
		before: null,
		after: {
			foo: 'bar'
		}
	})
})

ava('.reconstruct() should throw given an invalid object', (test) => {
	const cache = {}

	test.throws(() => {
		payload.reconstruct(cache, {
			identity: 'aaaaaaaaaaaaaaaaaaaa',
			totalPages: 1,
			currentPage: 1,
			message: Buffer.from('{"after":')
		})
	}, {
		message: 'Invalid notification: {"after":'
	})
})
