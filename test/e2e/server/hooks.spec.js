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

ava.serial('should post a dummy "none" event', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/none', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 200)
})

ava.serial('should not be able to post an unsupported external event', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/test', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})
