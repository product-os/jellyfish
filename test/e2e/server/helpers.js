/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const helpers = require('../../integration/core/helpers')
const environment = require('../../../lib/environment')

module.exports = {
	before: async (test) => {
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

	after: _.noop
}
