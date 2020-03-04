/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.github

ava.serial.beforeEach(scenario.beforeEach)
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
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
