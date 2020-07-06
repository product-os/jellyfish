/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const scenario = require('./scenario')
const environment = require('@balena/jellyfish-environment')
const TOKEN = environment.integration.flowdock
const helpers = require('./helpers')

ava.serial.before(async (test) => {
	await scenario.before(test)
	await helpers.save(test)
})

ava.serial.after.always(scenario.after)
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
	integration: require('../../../lib/sync/integrations/flowdock'),
	scenarios: require('./webhooks/flowdock'),
	baseUrl: 'https://api.flowdock.com',
	stubRegex: /.*/,
	source: 'flowdock',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Basic ${Buffer.from(self.options.token.api).toString('base64')}`
	}
})
