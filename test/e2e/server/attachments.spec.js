/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.before)
ava.after(helpers.sdk.after)

ava.serial('should return 404 given a non existent attachment in a card', async (test) => {
	const result = await test.context.http(
		'GET', `/api/v2/file/${uuid()}/fil_3e7h9zv`)
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: 'Not Found'
	})
})

ava.serial('should return 404 given an attachment in a non existent card', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/file/23cb39dc-f333-4197-b332-c46812abadf9/fil_3e7h9zv')
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: 'Not Found'
	})
})
