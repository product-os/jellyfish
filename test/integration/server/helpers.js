/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bluebird = require('bluebird')
const request = require('request')
const randomstring = require('randomstring')
const helpers = require('../../unit/core/helpers')
const bootstrap = require('../../../apps/server/bootstrap')
const actionServer = require('../../../lib/action-server/bootstrap')

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
				request({
					method,
					baseUrl: `http://localhost:${test.context.server.port}`,
					url: uri,
					json: true,
					body: payload,
					headers
				}, (error, response, body) => {
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
