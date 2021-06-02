/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const Bluebird = require('bluebird')
const request = require('request')
const _ = require('lodash')
const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const bootstrap = require('../../lib/bootstrap')
const {
	getPluginManager
} = require('../../lib/plugins')
const actionServer = require('../../../action-server/lib/bootstrap')
const utils = require('../../../../test/integration/utils')

const workerOptions = {
	onError: (context, error) => {
		throw error
	},
	database: {
		database: `test_${uuid().replace(/-/g, '_')}`
	}
}

module.exports = {
	before: async (test) => {
		test.context.context = {
			id: `SERVER-TEST-${uuid()}`
		}

		test.context.server = await bootstrap(test.context.context, {
			database: workerOptions.database,
			pluginManager: getPluginManager(test.context.context)
		})
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

		test.context.createUser = async (username) => {
			const {
				sdk
			} = test.context
			const slug = `user-${username}`
			const userCard = await sdk.card.get(slug) ||
				await sdk.action({
					card: 'user@1.0.0',
					type: 'type',
					action: 'action-create-user@1.0.0',
					arguments: {
						username: slug,
						email: `${username}@example.com`,
						password: 'foobarbaz'
					}
				})
			const orgCard = await sdk.card.get('org-balena')
			await sdk.card.link(userCard, orgCard, 'is member of')
			return userCard
		}

		const userCard = await test.context.createUser(test.context.username)

		// Force login, even if we don't know the password
		test.context.session = await test.context.sdk.card.create({
			slug: `session-${userCard.slug}-integration-tests-${uuid()}`,
			type: 'session',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

		await test.context.sdk.auth.loginWithToken(test.context.session.id)
		test.context.user = await test.context.sdk.auth.whoami()

		test.context.waitForMatch = async (query, times = 40) => {
			if (times === 0) {
				throw new Error('The wait query did not resolve')
			}

			const results = await test.context.sdk.query(query)

			if (results.length > 0) {
				return results[0]
			}
			await Bluebird.delay(1000)
			return test.context.waitForMatch(query, times - 1)
		}
	},
	after: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
		await test.context.actionWorker.stop()
		await test.context.server.close()
	},
	beforeEach: (test) => {
		test.context.generateRandomSlug = utils.generateRandomSlug

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
