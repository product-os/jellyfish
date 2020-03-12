/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../client-sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

ava.serial('/api/v2/oauth should return 400 given an unknown oauth integration', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/oauth/helloworld/user-test')
	test.deepEqual(result, {
		code: 400,
		headers: result.headers,
		response: {
			url: null
		}
	})
})
