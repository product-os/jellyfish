/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
const _ = require('lodash')
const url = require('url')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.discourse

ava.beforeEach(scenario.beforeEach)
ava.afterEach(scenario.afterEach)

const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava

scenario.run(avaTest, {
	integration: require('../../../lib/sync/integrations/discourse'),
	scenarios: require('./webhooks/discourse'),
	baseUrl: 'https://forums.balena.io',
	stubRegex: /.*/,
	source: 'discourse',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		const params = querystring.parse(url.parse(request.path).query)
		return params.api_key === self.options.token.api &&
			params.api_username === self.options.token.username
	}
})
