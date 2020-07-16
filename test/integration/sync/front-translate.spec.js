/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const scenario = require('./scenario')
const environment = require('@balena/jellyfish-environment')
const TOKEN = environment.integration.front
const helpers = require('./helpers')

ava.serial.before(async (test) => {
	await scenario.before(test)
	await helpers.save(test)
})

ava.serial.after.always(scenario.after)
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
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
		return request.options.headers.authorization === `Bearer ${self.options.token.api}` ||
		request.options.headers.authorization.startsWith('Basic')
	}
})
