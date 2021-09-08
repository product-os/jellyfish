/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const environment = require('@balena/jellyfish-environment').defaultEnvironment

module.exports = {
	before: async (test) => {
		test.context.retry = async (fn, checkResult, times = 10, delay = 500) => {
			const result = await fn()
			if (!checkResult(result)) {
				if (times > 0) {
					await Bluebird.delay(delay)
					return test.context.retry(fn, checkResult, times - 1)
				}
				test.fail(`Function failed after ${times} attempts`)
			}
			return result
		}

		test.context.generateRandomSlug = (options) => {
			const suffix = uuid()
			if (options.prefix) {
				return `${options.prefix}-${suffix}`
			}

			return suffix
		}

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

	after: _.noop
}
