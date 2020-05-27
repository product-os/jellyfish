/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Node = require('../../../../../../apps/server/graphql/types/node')
const graphql = require('graphql')

ava('it has the correct name', (test) => {
	test.is(Node.name, 'Node')
})

ava('it is a GraphQL interface', (test) => {
	test.true(graphql.isInterfaceType(Node))
})

ava('contains only the `id` field', (test) => {
	test.deepEqual(Object.keys(Node.getFields()), [ 'id' ])
})

ava('the `id` field is non null', (test) => {
	test.true(graphql.isNonNullType(Node.getFields().id.type))
})

ava('if `id` field inner type is `ID`', (test) => {
	test.is(graphql.getNullableType(Node.getFields().id.type).name, 'ID')
})
