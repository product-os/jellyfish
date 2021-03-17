/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava.serial('/api/v2/oauth should return 404 given an unknown oauth integration', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/oauth/helloworld/auth_url')

	test.is(result.code, 404)
})
