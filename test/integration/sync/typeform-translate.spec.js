/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const scenario = require('./scenario')
const helpers = require('./helpers')

ava.serial.before(async (test) => {
	await scenario.before(test)
	await helpers.save(test)
})
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
	integration: require('../../../lib/sync/integrations/typeform'),
	scenarios: require('./webhooks/typeform'),
	baseUrl: 'https://api.typeform.com',
	stubRegex: /.*/,
	source: 'typeform',
	// eslint-disable-next-line lodash/prefer-constant
	isAuthorized: () => {
		return true
	}
})
