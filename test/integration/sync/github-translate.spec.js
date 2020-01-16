/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.github

ava.beforeEach(scenario.beforeEach)
ava.afterEach.always(scenario.afterEach)

const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava

scenario.run(avaTest, {
	integration: require('../../../lib/sync/integrations/github'),
	scenarios: require('./webhooks/github'),
	baseUrl: 'https://api.github.com',
	stubRegex: /.*/,
	source: 'github',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization &&
			request.headers.authorization[0] === `token ${self.options.token.api}`
	}
})
