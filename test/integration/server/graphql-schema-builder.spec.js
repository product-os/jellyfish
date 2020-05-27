/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bootstrap = require('../../../apps/server/bootstrap')
const uuid = require('uuid/v4')
const schemaBuilder = require('../../../apps/server/graphql/schema-builder')
const logger = require('../../../lib/logger').getLogger(__filename)
const baseCards = require('../../../lib/core/cards')
const graphql = require('graphql')

ava.serial.before(async (test) => {
	test.context.context = {
		id: `SERVER-TEST-${uuid()}`
	}
	test.context.server = await bootstrap(test.context.context)
})

ava.serial.after(async (test) => {
	test.context.server.close()
})

const InstrospectionQuery = graphql.parse(graphql.introspectionQuery)

ava('it generates a valid schema on server startup', async (test) => {
	const schema = await schemaBuilder(test.context.context, {
		jellyfish: test.context.server.worker.jellyfish, logger, baseCards
	})

	const errors = await graphql.validate(schema, InstrospectionQuery)

	test.deepEqual(errors, [])
})
