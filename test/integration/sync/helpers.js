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

const nock = require('nock')
const uuid = require('uuid/v4')
const path = require('path')
const _ = require('lodash')
const helpers = require('../sdk/helpers')
const syncHelpers = require('../../unit/sync/helpers')
const queue = require('../../../lib/queue')

const tailSort = [
	(card) => {
		return card.data.timestamp
	},
	(card) => {
		return card.type
	}
]

const webhookScenario = async (test, testCase, integration, stub) => {
	await nock(stub.baseUrl)
		.persist()
		.get(stub.uriPath)
		.query(true)
		.reply(function (uri, request, callback) {
			if (!stub.isAuthorized(this.req)) {
				return callback(null, [ 401, this.req.headers ])
			}

			const json = path.join(stub.basePath, testCase.name,
				testCase.variant, `${_.kebabCase(uri)}.json`)
			try {
				return callback(null, [ 200, require(json) ])
			} catch (error) {
				return callback(null, [ 404, json ])
			}
		})

	const cards = []
	for (const step of testCase.steps) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: test.context.generateRandomSlug({
					prefix: 'external-event'
				}),
				version: '1.0.0',
				data: {
					source: integration.source,
					headers: step.headers,
					payload: step.payload
				}
			})

		const request = await test.context.worker.enqueue(test.context.session, {
			action: 'action-integration-import-event',
			card: event.id,
			type: event.type,
			arguments: {}
		})

		await test.context.flush(test.context.session)
		const result = await queue.waitResults(
			test.context.context, test.context.jellyfish, test.context.session, request)
		test.false(result.error)
		cards.push(...result.data)
	}

	if (!testCase.expected.head) {
		test.is(cards.length, 0)
		return
	}

	test.true(cards.length > 0)

	const head = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, cards[0].id, {
			type: cards[0].type
		})
	Reflect.deleteProperty(head, 'links')
	Reflect.deleteProperty(head, 'markers')

	const timeline = await test.context.jellyfish.query(test.context.context,
		test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'target' ],
					additionalProperties: true,
					properties: {
						target: {
							type: 'string',
							const: head.id
						}
					}
				}
			}
		})

	test.deepEqual(Object.assign({}, testCase.expected.head, _.omitBy({
		id: head.id,
		slug: head.slug,
		created_at: head.created_at
	}, _.isEmpty)), head)

	const actualTail = _.map(_.sortBy(timeline, tailSort), (card) => {
		Reflect.deleteProperty(card, 'slug')
		Reflect.deleteProperty(card, 'links')
		Reflect.deleteProperty(card, 'markers')
		Reflect.deleteProperty(card, 'created_at')

		if (card.data.payload) {
			Reflect.deleteProperty(card.data.payload, 'slug')
			Reflect.deleteProperty(card.data.payload, 'links')
			Reflect.deleteProperty(card.data.payload, 'markers')
			Reflect.deleteProperty(card.data.payload, 'created_at')
		}

		return card
	})

	const expectedTail = _.map(_.sortBy(testCase.expected.tail, tailSort), (card, index) => {
		card.id = _.get(actualTail, [ index, 'id' ])
		card.data.actor = _.get(actualTail, [ index, 'data', 'actor' ])

		// TODO: This shouldn't be necessary anymore
		if (testCase.mockTimestamps) {
			card.data.timestamp = _.get(actualTail, [ index, 'data', 'timestamp' ])
		}

		card.data.target = head.id
		return card
	})

	test.deepEqual(expectedTail, actualTail)
}

exports.translate = {
	beforeEach: async (test) => {
		await syncHelpers.beforeEach(test)

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/external-event.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/issue.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/pull-request.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/support-thread.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/whisper.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-integration-import-event.json'))

		nock.disableNetConnect()
	},
	afterEach: async (test) => {
		await syncHelpers.afterEach(test)

		nock.cleanAll()
	},

	scenario: async (ava, suite) => {
		for (const testCaseName of Object.keys(suite.scenarios)) {
			const testCase = suite.scenarios[testCaseName]

			for (const slice of suite.slices) {
				if (testCase.steps.length <= slice) {
					continue
				}

				const prefix = `slice-${slice}`
				const fn = ava.serial || ava

				fn(`(${prefix}) ${testCaseName}`, async (test) => {
					await webhookScenario(test, {
						steps: testCase.steps.slice(slice),
						expected: {
							head: testCase.expected.head,
							tail: _.sortBy(testCase.expected.tail, tailSort)
						},
						mockTimestamps: slice > 0,
						name: testCaseName,
						variant: prefix
					}, {
						constructor: suite.integration,
						source: suite.source,
						options: Object.assign({
							context: test.context.context,
							session: test.context.session,
							actor: test.context.actor.id
						}, suite.options)
					}, {
						baseUrl: suite.baseUrl,
						uriPath: suite.stubRegex,
						basePath: path.join(__dirname, 'webhooks', suite.source),
						isAuthorized: _.partial(suite.isAuthorized, suite)
					})
				})
			}

			// TODO: Test shuffling the steps
		}
	}
}

exports.mirror = {
	before: async (test) => {
		await helpers.sdk.beforeEach(test)
	},
	after: async (test) => {
		await helpers.sdk.afterEach(test)
	},
	beforeEach: async (test, username) => {
		test.context.username = username

		// Create the user, only if it doesn't exist yet
		const userCard = await test.context.jellyfish.getCardBySlug(test.context.context,
			test.context.jellyfish.sessions.admin,
			`user-${test.context.username}`, {
				type: 'user'
			}) ||
			await test.context.sdk.auth.signup({
				username: test.context.username,
				email: `${test.context.username}@example.com`,
				password: 'foobarbaz'
			})

		// So it can access all the necessary cards, make the user a member of the
		// balena org
		const orgCard = await test.context.jellyfish.getCardBySlug(test.context.context,
			test.context.session, 'org-balena', {
				type: 'org'
			})

		await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
			slug: `link-${orgCard.id}-has-member-${userCard.id}`,
			type: 'link',
			name: 'has member',
			data: {
				inverseName: 'is member of',
				from: {
					id: orgCard.id,
					type: orgCard.type
				},
				to: {
					id: userCard.id,
					type: userCard.type
				}
			}
		}, {
			override: true
		})

		// Force login, even if we don't know the password
		const session = await test.context.jellyfish.insertCard(test.context.context,
			test.context.jellyfish.sessions.admin, {
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
	afterEach: async (test) => {
		await test.context.sdk.auth.logout()
	}
}
