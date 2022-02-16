const ava = require('ava')
const helpers = require('./helpers')

ava.serial('/api/v2/oauth should return 400 given an unknown oauth integration', async (test) => {
	const result = await helpers.http(
		'GET', '/api/v2/oauth/helloworld/user-test')
	test.deepEqual(result, {
		code: 400,
		headers: result.headers,
		response: {
			error: false,
			data: {
				url: null
			}
		}
	})
})
