import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import Bluebird from 'bluebird';
import request from 'request';
import { v4 as uuidv4 } from 'uuid';
import { bootstrap } from '../../lib/bootstrap';
import { getPluginManager } from '../../lib/plugins';

const context = {} as any;

beforeAll(async () => {
	context.context = {
		id: `SERVER-TEST-${uuidv4()}`,
	};
	context.server = await bootstrap(context.context, {
		onError: (_context, error) => {
			throw error;
		},
		pluginManager: getPluginManager(context.context),
	});
});

afterAll(async () => {
	await context.server.close();
});

const getMetrics = async () => {
	return new Bluebird<any>((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `http://localhost:${environment.metrics.ports.socket}`,
			url: '/metrics',
			auth: {
				user: 'monitor',
				pass: environment.metrics.token,
			},
		};

		request(requestOptions, (error, response, body) => {
			if (error) {
				return reject(error);
			}

			return resolve({
				code: response.statusCode,
				headers: response.headers,
				response: body,
			});
		});
	});
};

test('Socket metrics endpoint should return websocket metrics data', async () => {
	const result = await getMetrics();

	expect(result.code).toBe(200);
	expect(result.response.includes('socket_io')).toBeTruthy();
});
