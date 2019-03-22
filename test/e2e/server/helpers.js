/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const request = require('request')
const uuid = require('uuid/v4')
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
			id: `SERVER-TEST-${uuid()}`
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

		test.context.addUserToBalenaOrg = async (userId) => {
			const context = test.context
			const balenaOrgCard = await context.server.jellyfish.getCardBySlug(
				context.context, context.session, 'org-balena', {
					type: 'org'
				})

			// Add the community user to the balena org
			await context.server.jellyfish.insertCard(
				context.context,
				context.session,
				{
					type: 'link',
					name: 'has member',
					slug: `link-${balenaOrgCard.id}--${userId}`,
					data: {
						from: {
							id: balenaOrgCard.id,
							type: balenaOrgCard.type
						},
						to: {
							id: userId,
							type: 'user'
						},
						inverseName: 'is member of'
					}
				}
			)
		}

		test.context.insertCard = (card) => {
			return test.context.server.jellyfish.insertCard(
				test.context.context,
				test.context.session,
				card
			)
		}

		test.context.createUser = async (user) => {
			const action = {
				card: 'user',
				type: 'type',
				action: 'action-create-user',
				arguments: {
					email: user.email,
					username: `user-${user.username}`,
					hash: {
						string: user.password,
						salt: `user-${user.username}`
					}
				},
				context: test.context.context
			}

			const results = await test.context.queue.enqueue(
				test.context.server.worker.getId(),
				test.context.session, action
			).then((actionRequest) => {
				return test.context.queue.waitResults({}, actionRequest)
			})

			return results.data
		}
	},

	afterEach: async (test) => {
		await test.context.actionWorker2.stop()
		await test.context.actionWorker1.stop()
		await test.context.tickWorker.stop()
		await test.context.server.close()
	}
}
