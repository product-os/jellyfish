/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.before)
ava.after(helpers.sdk.after)

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
