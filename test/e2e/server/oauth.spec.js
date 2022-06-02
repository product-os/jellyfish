const ava = require('ava')
const helpers = require('./helpers')

ava.serial('/api/v2/oauth/<provider>/url should return 404 given an unknown oauth provider', async (test) => {
	const result = await helpers.http(
		'GET', '/api/v2/oauth/oauth-provider-helloworld@1.0.0/url')
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: {
			error: true,
			data: 'Oauth provider "oauth-provider-helloworld@1.0.0" not found'
		}
	})
})
