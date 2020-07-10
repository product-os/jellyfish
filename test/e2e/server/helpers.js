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
const environment = require('@balena/jellyfish-environment')

const waitForServer = async (test, retries = 50) => {
	try {
		await test.context.http('GET', '/readiness')
	} catch (error) {
		if (retries > 0 &&
			(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET')) {
			console.error('Waiting for API...')
			await Bluebird.delay(5000)
			await waitForServer(test, retries - 1)
			return
		}

		throw error
	}
}

module.exports = {
	before: async (test) => {
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

		/*
		 * Ensure that the system is healthy before attempting to
		 * run the end to end tests, given Docker Compose doesn't
		 * seem to wait for healthchecks to pass before resolving
		 * from the "docker-compose up" command.
		 */
		await waitForServer(test)
	},

	after: _.noop
}
