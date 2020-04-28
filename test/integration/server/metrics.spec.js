/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const environment = require('../../../lib/environment')
const request = require('request')
const bootstrap = require('../../../apps/server/bootstrap')
const uuid = require('uuid/v4')

ava.serial.before(async (test) => {
	test.context.context = {
		id: `SERVER-TEST-${uuid()}`
	}
	test.context.server = await bootstrap(test.context.context)
})

ava.serial.after(async (test) => {
	test.context.server.close()
})

const getMetrics = async (port) => {
	return new Bluebird((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `http://localhost:${port}`,
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

ava.serial('App metrics endpoint should return app metrics data', async (test) => {
	const result = await getMetrics(environment.metrics.ports.app)

	test.is(result.code, 200)
	test.truthy(result.response.includes('jf_card_upsert_total'))
	test.truthy(result.response.includes('jf_card_read_total'))
})

ava.serial('Socket metrics endpoint should return websocket metrics data', async (test) => {
	const result = await getMetrics(environment.metrics.ports.socket)

	test.is(result.code, 200)
	test.truthy(result.response.includes('socket_io'))
})
