import { http } from './helpers';

test('should post a dummy "none" event', async () => {
	const result = await http('POST', '/api/v2/hooks/none', {
		foo: 'bar',
		bar: 'baz',
	});

	expect(result.code).toEqual(200);
});

test('should not be able to post an unsupported external event', async () => {
	const result = await http('POST', '/api/v2/hooks/test', {
		foo: 'bar',
		bar: 'baz',
	});

	expect(result.code).toEqual(401);
	expect(result.response.error).toBe(true);
});
