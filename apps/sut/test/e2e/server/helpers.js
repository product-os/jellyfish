const environment = require('@balena/jellyfish-environment').defaultEnvironment
const _ = require('lodash')
const request = require('request')
const {
	v4: uuid
} = require('uuid')

exports.generateUserDetails = () => {
	const id = uuid().split('-')[0]
	return {
		username: `johndoe-${id}`,
		email: `johndoe-${id}@example.com`,
		password: 'password'
	}
}

exports.generateRandomSlug = (options) => {
	const suffix = uuid()
	if (options.prefix) {
		return `${options.prefix}-${suffix}`
	}

	return suffix
}

exports.http = (method, uri, payload, headers, options = {}) => {
	return new Promise((resolve, reject) => {
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
