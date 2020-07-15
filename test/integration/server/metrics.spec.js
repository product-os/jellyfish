/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const environment = require('@balena/jellyfish-environment')
const request = require('request')
const bootstrap = require('../../../apps/server/bootstrap')
const {
	v4: uuid
} = require('uuid')

ava.serial.before(async (test) => {
	test.context.context = {
		id: `SERVER-TEST-${uuid()}`
	}
	test.context.server = await bootstrap(test.context.context)
})

ava.serial.after(async (test) => {
	test.context.server.close()
})

const getMetrics = async () => {
	return new Bluebird((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `http://localhost:${environment.metrics.ports.socket}`,
			url: '/metrics',
			auth: {
				user: 'monitor',
				pass: environment.metrics.token
			}
		}

		request(requestOptions, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			return resolve({
				code: response.statusCode,
				headers: response.headers,
				response: body
			})
		})
	})
}

ava.serial('Socket metrics endpoint should return websocket metrics data', async (test) => {
	const result = await getMetrics()

	test.is(result.code, 200)
	test.truthy(result.response.includes('socket_io'))
})
