/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bootstrap = require('../../lib/bootstrap')
const {
	v4: uuid
} = require('uuid')
const schemaBuilder = require('../../lib/graphql/schema-builder')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const baseCards = require('@balena/jellyfish-core/lib/cards')
const graphql = require('graphql')

ava.serial.before(async (test) => {
	test.context.context = {
		id: `SERVER-TEST-${uuid()}`
	}
	test.context.server = await bootstrap.api(test.context.context)
})

ava.serial.after(async (test) => {
	test.context.server.close()
})

const InstrospectionQuery = graphql.parse(graphql.getIntrospectionQuery())

ava('it generates a valid schema on server startup', async (test) => {
	const schema = await schemaBuilder(test.context.context, {
		jellyfish: test.context.server.worker.jellyfish, logger, baseCards
	})

	const errors = await graphql.validate(schema, InstrospectionQuery)

	test.deepEqual(errors, [])
})
