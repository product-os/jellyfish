const ava = require('ava')
const helpers = require('./helpers')

ava.serial('/api/v2/oauth/url/:provider should return 404 given an unknown oauth provider', async (test) => {
	const result = await helpers.http(
		'GET', '/api/v2/oauth/url/helloworld')
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: {
			error: true,
			data: 'Oauth provider "helloworld" not found'
		}
	})
})
