/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.getIntegrationToken('github')

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

helpers.translate.scenario(TOKEN ? ava : ava.skip, {
	integration: require('../../../lib/sync/integrations/github'),
	scenarios: require('./webhooks/github'),
	slices: _.range(0, 3),
	baseUrl: 'https://api.github.com',
	stubRegex: /^\/repos\/.+\/.+\/(issues|pulls)\/\d+(\/comments)*$/,
	source: 'github',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization &&
			request.headers.authorization[0] === `token ${self.options.token.api}`
	}
})
