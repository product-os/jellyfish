/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const request = require('request')
const randomstring = require('randomstring')
const helpers = require('../../integration/core/helpers')
const bootstrap = require('../../../apps/server/bootstrap')
const actionServer = require('../../../apps/action-server/bootstrap')

const workerOptions = {
	onError: (context, error) => {
		throw error
	}
}

exports.server = {
	beforeEach: async (test) => {
		test.context.context = {
			id: `SERVER-TEST-${randomstring.generate(20)}`
		}

		test.context.server = await bootstrap(test.context.context)
		test.context.tickWorker = await actionServer.tick(test.context.context, workerOptions)
		test.context.actionWorker1 = await actionServer.worker(test.context.context, workerOptions)
		test.context.actionWorker2 = await actionServer.worker(test.context.context, workerOptions)

		test.context.jellyfish = test.context.server.jellyfish
		test.context.queue = test.context.server.queue
		test.context.session = test.context.jellyfish.sessions.admin
		test.context.guestSession = test.context.server.guestSession
		test.context.generateRandomSlug = helpers.generateRandomSlug

		test.context.http = (method, uri, payload, headers) => {
			return new Bluebird((resolve, reject) => {
				const options = {
					method,
					baseUrl: `http://localhost:${test.context.server.port}`,
					url: uri,
					json: true,
					headers
				}

				if (payload) {
					options.body = payload
				}

				request(options, (error, response, body) => {
					if (error) {
						return reject(error)
					}

					return resolve({
						code: response.statusCode,
						response: body
					})
				})
			})
		}
	},

	afterEach: async (test) => {
		await test.context.actionWorker2.stop()
		await test.context.actionWorker1.stop()
		await test.context.tickWorker.stop()
		await test.context.server.close()
	}
}
