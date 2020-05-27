/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const schemaBuilder = require('../../../../../apps/server/graphql/schema-builder')
const sinon = require('sinon')
const graphql = require('graphql')
const baseCards = require('../../../../../lib/core/cards')

const FakeJellyfish = {
	sessions: {
		admin: 'Marty McFly'
	}
}

const FakeCard = {
	slug: 'time-machine',
	type: 'type@1.0.0',
	version: '1.0.0',
	name: 'A Time Machine',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						make: {
							type: 'string'
						},
						model: {
							type: 'string'
						}
					},
					required: [ 'make', 'model' ]
				}
			},
			required: [ 'data' ]
		}
	},
	requires: [],
	capabilities: []
}

const InstrospectionQuery = graphql.parse(graphql.introspectionQuery)

ava('it builds a valid GraphQL schema', async (test) => {
	const context = {
		id: 'test-context'
	}
	const logger = {}

	const jellyfish = {
		...FakeJellyfish, query: sinon.stub()
	}
	jellyfish.query.resolves([ FakeCard ])

	const schema = await schemaBuilder(context, {
		jellyfish, logger, baseCards
	})

	const errors = await graphql.validate(schema, InstrospectionQuery)

	test.deepEqual(errors, [])
})
