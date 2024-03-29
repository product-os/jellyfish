const ava = require('ava');
const helpers = require('./helpers');

ava.serial('should post a dummy "none" event', async (test) => {
	const result = await helpers.http('POST', '/api/v2/hooks/none', {
		foo: 'bar',
		bar: 'baz',
	});

	test.is(result.code, 200);
});

ava.serial(
	'should not be able to post an unsupported external event',
	async (test) => {
		const result = await helpers.http('POST', '/api/v2/hooks/test', {
			foo: 'bar',
			bar: 'baz',
		});

		test.is(result.code, 401);
		test.true(result.response.error);
	},
);
