/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const request = require('request')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

const getMetrics = async (port) => {
	return new Bluebird((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `${environment.http.host}:${port}`,
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
