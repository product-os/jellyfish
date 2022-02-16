const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')

ava.serial('should return 404 given a non existent attachment in a card', async (test) => {
	const result = await helpers.http(
		'GET', `/api/v2/file/${uuid()}/fil_3e7h9zv`)
	test.is(result.code, 404)
})

ava.serial('should return 404 given an attachment in a non existent card', async (test) => {
	const result = await helpers.http(
		'GET', '/api/v2/file/23cb39dc-f333-4197-b332-c46812abadf9/fil_3e7h9zv')
	test.is(result.code, 404)
})
