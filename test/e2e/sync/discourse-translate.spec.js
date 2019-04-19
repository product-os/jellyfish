/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
const url = require('url')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.getIntegrationToken('discourse')

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

helpers.translate.scenario(TOKEN ? ava : ava.skip, {
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
