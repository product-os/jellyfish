/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphqlHTTP = require('express-graphql')
const _ = require('lodash')
const uuid = require('@balena/jellyfish-uuid')
const schemaBuilder = require('./schema-builder')

module.exports = (cards) => {
	return async (uri = '/graphql', application, context = {}) => {
		const EXECUTION_CONTEXT = {
			id: `GRAPHQL-SERVER-STARTUP-${await uuid.random()}`
		}

		context.baseCards = cards

		const schema = await schemaBuilder(EXECUTION_CONTEXT, context)

		application.use(uri, graphqlHTTP((request) => {
			return {
				schema,
				context: _.merge({}, context, {
					request
				}),
				graphiql: true
			}
		}))
	}
}
