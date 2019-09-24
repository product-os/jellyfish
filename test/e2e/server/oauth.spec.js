/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

ava.before(async (test) => {
	await helpers.before(test)

	const session = await test.context.sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})

	test.context.token = session.id
})

ava.after(helpers.after)

ava.beforeEach(async (test) => {
	await helpers.beforeEach(test, test.context.token)
})

ava.afterEach(helpers.afterEach)

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
