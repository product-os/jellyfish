/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const payload = require(
	'../../../../../../../lib/core/backend/postgres/streams/pg-live-select/payload')

ava('.parse() should parse a simple object', (test) => {
	const data = '9BB58F26192E4BA00F01E2E7B136BBD8:1:1:{"foo":"bar"}'
	const result = payload.parse(data)
	test.deepEqual(result, {
		checksum: '9BB58F26192E4BA00F01E2E7B136BBD8',
		totalPages: 1,
		currentPage: 1,
		message: '{"foo":"bar"}'
	})
})

ava('.parse() should parse an incomplete object', (test) => {
	const data = 'D60FDC24F620015A6FC7127D820C2DCA:1:1:{"foo":"bar","baz":'
	const result = payload.parse(data)
	test.deepEqual(result, {
		checksum: 'D60FDC24F620015A6FC7127D820C2DCA',
		totalPages: 1,
		currentPage: 1,
		message: '{"foo":"bar","baz":'
	})
})

ava('.parse() should a chunk of a bigger message', (test) => {
	const data = '9BB58F26192E4BA00F01E2E7B136BBD8:3:2:{"foo":"bar"}'
	const result = payload.parse(data)
	test.deepEqual(result, {
		checksum: '9BB58F26192E4BA00F01E2E7B136BBD8',
		totalPages: 3,
		currentPage: 2,
		message: '{"foo":"bar"}'
	})
})

ava('.reconstruct() should reconstruct a one page simple object', (test) => {
	const cache = {}
	const result = payload.reconstruct(cache, {
		checksum: '25BBCD9E75E32643EF9012384B8D8D38',
		totalPages: 1,
		currentPage: 1,
		message: '{"after":{"foo":"bar"}}'
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
	const cache = {}
	const result = payload.reconstruct(cache, {
		checksum: '757F699B576B977266F83B0F4F1FE4DD',
		totalPages: 2,
		currentPage: 1,
		message: '{"after":{"foo"'
	})

	test.deepEqual(cache, {
		'757F699B576B977266F83B0F4F1FE4DD': [ '{"after":{"foo"', null ]
	})

	test.deepEqual(result, null)
})

ava('.reconstruct() should re-assemble a two parts message', (test) => {
	const cache = {}

	const result1 = payload.reconstruct(cache, {
		checksum: '757F699B576B977266F83B0F4F1FE4DD',
		totalPages: 2,
		currentPage: 1,
		message: '{"after":{"foo"'
	})

	const result2 = payload.reconstruct(cache, {
		checksum: '757F699B576B977266F83B0F4F1FE4DD',
		totalPages: 2,
		currentPage: 2,
		message: ':"bar"}}'
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
		checksum: '757F699B576B977266F83B0F4F1FE4DD',
		totalPages: 2,
		currentPage: 2,
		message: ':"bar"}}'
	})

	const result2 = payload.reconstruct(cache, {
		checksum: '757F699B576B977266F83B0F4F1FE4DD',
		totalPages: 2,
		currentPage: 1,
		message: '{"after":{"foo"'
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
			checksum: '25BBCD9E75E32643EF9012384B8D8D38',
			totalPages: 1,
			currentPage: 1,
			message: '{"after":'
		})
	}, 'Invalid notification: {"after":')
})
