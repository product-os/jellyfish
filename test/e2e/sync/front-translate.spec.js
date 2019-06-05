/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.front

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava

helpers.translate.scenario(avaTest, {
	integration: require('../../../lib/sync/integrations/front'),
	scenarios: require('./webhooks/front'),
	slices: _.range(0, 50),
	baseUrl: /(api2.frontapp.com|api.intercom.io)(:443)?$/,
	stubRegex: /.*/,
	source: 'front',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Bearer ${self.options.token.api}` ||
			request.headers.authorization.startsWith('Basic')
	}
})
