/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const environment = require('@balena/jellyfish-environment')
const request = require('request')
const actionServer = require('../../../apps/action-server/bootstrap')
const {
	v4: uuid
} = require('uuid')

ava.serial.before(async (test) => {
	test.context.actionWorker = await actionServer.worker({
		id: `SERVER-TEST-${uuid()}`
	}, {
		metricsPort: environment.metrics.ports.app,
		onError: (context, error) => {
			throw error
		}
	})
})

ava.serial.after(async (test) => {
	test.context.actionWorker.stop()
})

const getMetrics = async () => {
	return new Bluebird((resolve, reject) => {
		const requestOptions = {
			method: 'GET',
			baseUrl: `http://localhost:${environment.metrics.ports.app}`,
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
	const result = await getMetrics()

	test.is(result.code, 200)
	test.truthy(result.response.includes('jf_card_upsert_total'))
	test.truthy(result.response.includes('jf_card_read_total'))
})
