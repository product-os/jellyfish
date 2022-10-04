import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { testUtils as aTestUtils } from 'autumndb';
import _ from 'lodash';
import * as request from 'request';

interface UserDetails {
	username: string;
	email: string;
	password: string;
}

export function generateUserDetails(): UserDetails {
	const id = aTestUtils.generateRandomId().split('-')[0];
	return {
		username: `johndoe-${id}`,
		email: `johndoe-${id}@example.com`,
		password: 'password',
	};
}

export function http(
	method: string,
	uri: string,
	payload: any,
	headers: any,
	options: { json?: string } = {},
) {
	return new Promise((resolve, reject) => {
		const requestOptions: any = {
			method,
			baseUrl: `${environment.http.host}:${environment.http.port}`,
			url: uri,
			json: _.isNil(options.json) ? true : options.json,
			headers,
		};

		if (payload) {
			requestOptions.body = payload;
		}

		request(requestOptions, (error: Error, response: any, body: any) => {
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
}
