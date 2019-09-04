/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

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
