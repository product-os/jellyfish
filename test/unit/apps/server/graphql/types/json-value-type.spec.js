/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const graphql = require('graphql')
const {
	JsonValueType
} = require('../../../../../../apps/server/graphql/types')

ava('it has the correct name', (test) => {
	test.is(JsonValueType.name, 'JsonValueType')
})

ava('it is a GraphQL enumeration type', (test) => {
	test.true(graphql.isEnumType(JsonValueType))
})

ava('it contains options for all JSON data types', (test) => {
	const optionNames = JsonValueType
		.getValues()
		.map((value) => { return value.name })
		.sort()

	const optionValues = JsonValueType
		.getValues()
		.map((value) => { return value.value })
		.sort()

	test.deepEqual(optionNames, [ 'BOOLEAN', 'FLOAT', 'INTEGER', 'LIST', 'NULL', 'OBJECT', 'STRING' ])
	test.deepEqual(optionValues, [ 'boolean', 'float', 'integer', 'list', 'null', 'object', 'string' ])
})
