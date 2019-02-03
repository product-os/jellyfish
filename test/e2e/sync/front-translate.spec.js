/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.getIntegrationToken('front')

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

helpers.translate.scenario(TOKEN ? ava : ava.skip, {
	integration: require('../../../lib/sync/integrations/front'),
	scenarios: require('./webhooks/front'),
	slices: _.range(0, 50),
	baseUrl: 'https://api2.frontapp.com',
	stubRegex: /^\/(conversations|contacts)\/.+(\/(messages|inboxes))?$/,
	source: 'front',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Bearer ${self.options.token.api}`
	}
})
