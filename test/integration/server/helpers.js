/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const Bluebird = require('bluebird')
const request = require('request')
const _ = require('lodash')
const {
	getSdk
} = require('../../../lib/sdk')
const environment = require('../../../lib/environment')
const bootstrap = require('../../../apps/server/bootstrap')
const actionServer = require('../../../apps/action-server/bootstrap')

const workerOptions = {
	onError: (context, error) => {
		throw error
	}
}

module.exports = {
	before: async (test) => {
		test.context.context = {
			id: `SERVER-TEST-${uuid()}`
		}

		test.context.server = await bootstrap(test.context.context)
		test.context.actionWorker = await actionServer.worker(
			test.context.context, workerOptions)

		test.context.sdk = getSdk({
			apiPrefix: 'api/v2',
			apiUrl: `${environment.http.host}:${environment.http.port}`
		})

		const token = await test.context.sdk.auth.login({
			username: environment.test.user.username,
			password: environment.test.user.password
		})

		test.context.token = token.id
		test.context.sdk.setAuthToken(test.context.token)
		test.context.username = environment.integration.default.user

		const slug = `user-${test.context.username}`
		const userCard = await test.context.sdk.card.get(slug) ||
			await test.context.sdk.action({
				card: 'user@1.0.0',
				type: 'type',
				action: 'action-create-user@1.0.0',
				arguments: {
					username: slug,
					email: `${test.context.username}@example.com`,
					password: 'foobarbaz'
				}
			})
		const orgCard = await test.context.sdk.card.get('org-balena')
		await test.context.sdk.card.link(userCard, orgCard, 'is member of')

		// Force login, even if we don't know the password
		const session = await test.context.sdk.card.create({
			slug: `session-${userCard.slug}-integration-tests-${uuid()}`,
			type: 'session',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

		await test.context.sdk.auth.loginWithToken(session.id)
		test.context.user = await test.context.sdk.auth.whoami()
	},
	after: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
		await test.context.actionWorker.stop()
		await test.context.server.close()
	},
	beforeEach: (test) => {
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
	afterEach: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
	}
}
