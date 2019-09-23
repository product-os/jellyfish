/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const uuid = require('uuid/v4')
const helpers = require('../../integration/core/helpers')
const bootstrap = require('../../../apps/server/bootstrap')
const actionServer = require('../../../apps/action-server/bootstrap')
const environment = require('../../../lib/environment')

const workerOptions = {
	onError: (context, error) => {
		throw error
	}
}

exports.server = {
	beforeEach: async (test) => {
		test.context.context = {
			id: `SERVER-TEST-${uuid()}`
		}

		test.context.server = await bootstrap(test.context.context)
		test.context.tickWorker = await actionServer.tick(test.context.context, workerOptions)
		test.context.actionWorker = await actionServer.worker(test.context.context, workerOptions)

		test.context.queue = test.context.server.queue
		test.context.generateRandomSlug = helpers.generateRandomSlug

		test.context.http = (method, uri, payload, headers, options = {}) => {
			return new Bluebird((resolve, reject) => {
				const requestOptions = {
					method,
					baseUrl: `${environment.http.host}:${environment.http.port}`,
					url: uri,
					json: _.isNil(options.json) ? true : options.json,
					headers
				}

				if (payload) {
					requestOptions.body = payload
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
	},

	afterEach: async (test) => {
		await test.context.actionWorker.stop()
		await test.context.tickWorker.stop()
		await test.context.server.close()
	}
}
