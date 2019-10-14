/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.flowdock

ava.beforeEach(scenario.beforeEach)
ava.afterEach(scenario.afterEach)

const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava

scenario.run(avaTest, {
	integration: require('../../../lib/sync/integrations/flowdock'),
	scenarios: require('./webhooks/flowdock'),
	baseUrl: 'https://api.flowdock.com',
	stubRegex: /.*/,
	source: 'flowdock',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Basic ${self.options.token.api}`
	}
})
