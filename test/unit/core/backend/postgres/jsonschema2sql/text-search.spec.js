/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const textSearch = require('../../../../../../lib/core/backend/postgres/jsonschema2sql/text-search')

ava('toTSVector should prepare a correct to_tsvector function call for Postgres text fields', (test) => {
	const table = 'cards'
	const path = [ 'name' ]
	const isRootArray = false
	const result = textSearch.toTSVector(table, path, isRootArray)

	const expected = `to_tsvector('english', ${table}.${_.head(path)})`

	test.is(result, expected)
})

ava('toTSVector should prepare a correct to_tsvector function call for Postgres text[] fields', (test) => {
	const table = 'cards'
	const path = [ 'tags' ]
	const isRootArray = true
	const result = textSearch.toTSVector(table, path, isRootArray)

	const expected = `to_tsvector('english', immutable_array_to_string(${table}.${_.head(path)}, ' '))`

	test.is(result, expected)
})

ava('toTSVector should prepare a correct to_tsvector function call for keys inside of data', (test) => {
	const table = 'cards'
	const path = [ 'data', 'payload', 'message' ]
	const isRootArray = false
	const result = textSearch.toTSVector(table, path, isRootArray)

	const expected = `jsonb_to_tsvector('english', ${table}.${path.shift()}#>'{${path.join(',')}}', '["string"]')`

	test.is(result, expected)
})

ava('toTSQuery should prepare a correct plainto_tsquery function call', (test) => {
	const term = 'test'
	const result = textSearch.toTSQuery(term)

	const expected = `plainto_tsquery('english', '${term}')`

	test.is(result, expected)
})
