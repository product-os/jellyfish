/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import request from 'request';
import { bootstrap } from '../../lib/bootstrap';
import { getPluginManager } from '../../lib/plugins';
import { v4 as uuid } from 'uuid';

const context = {} as any;

beforeAll(async () => {
	context.context = {
		id: `SERVER-TEST-${uuid()}`,
	};
	context.server = await bootstrap(context.context, {
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
