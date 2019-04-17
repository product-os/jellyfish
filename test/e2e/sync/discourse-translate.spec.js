/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
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

	// TODO: Write a real authorized function
	isAuthorized: _.constant(true)
})
