/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const environment = require('../../../lib/environment')
const request = require('request')

const getMetrics = async (worker) => {
	return new Bluebird((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `http://${worker}:${environment.metrics.ports.app}`,
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

ava.serial('worker_1 /metrics endpoint should return app metrics data', async (test) => {
	const result = await getMetrics('worker_1')

	test.is(result.code, 200)
	test.truthy(result.response.includes('jf_card_upsert_total'))
	test.truthy(result.response.includes('jf_card_read_total'))
	test.truthy(result.response.includes('jf_worker_job_duration_ms'))
	test.truthy(result.response.includes('jf_worker_saturation'))
})

ava.serial('worker_2 /metrics endpoint should return app metrics data', async (test) => {
	const result = await getMetrics('worker_2')

	test.is(result.code, 200)
	test.truthy(result.response.includes('jf_card_upsert_total'))
	test.truthy(result.response.includes('jf_card_read_total'))
	test.truthy(result.response.includes('jf_worker_job_duration_ms'))
	test.truthy(result.response.includes('jf_worker_saturation'))
})

ava.serial('worker_3 /metrics endpoint should return app metrics data', async (test) => {
	const result = await getMetrics('worker_3')

	test.is(result.code, 200)
	test.truthy(result.response.includes('jf_card_upsert_total'))
	test.truthy(result.response.includes('jf_card_read_total'))
	test.truthy(result.response.includes('jf_worker_job_duration_ms'))
	test.truthy(result.response.includes('jf_worker_saturation'))
})
