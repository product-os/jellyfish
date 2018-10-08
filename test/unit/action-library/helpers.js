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
const path = require('path')
const _ = require('lodash')
const helpers = require('../worker/helpers')
const actionLibrary = require('../../../lib/action-library')
const sync = require('../../../lib/action-library/sync')

exports.sync = {
	beforeEach: async (test) => {
		await helpers.worker.beforeEach(test, actionLibrary)
		test.context.context = test.context.worker.getExecutionContext()
	},
	afterEach: async (test) => {
		await helpers.worker.afterEach(test)
	}
}

const webhookScenario = async (test, testCase, integration, stub) => {
	await nock(stub.baseUrl)
		.persist()
		.get(stub.uriPath)
		.query(true)
		.reply(function (uri, request, callback) {
			if (!stub.isAuthorized(this.req)) {
				return callback(null, [ 401, this.req.headers ])
			}

			const json = path.join(stub.basePath, testCase.name, testCase.variant, `${_.kebabCase(uri)}.json`)
			try {
				return callback(null, [ 200, require(json) ])
			} catch (error) {
				return callback(null, [ 404, json ])
			}
		})

	const cards = []
	for (const step of testCase.steps) {
		const event = await test.context.jellyfish.insertCard(
			test.context.session, {
				type: 'external-event',
				active: true,
				tags: [],
				links: {},
				data: {
					source: integration.source,
					headers: step.headers,
					payload: step.payload
				}
			})

		const result = await sync.translateExternalEvent(integration.constructor, event, integration.options)
		await test.context.flush(test.context.session)
		cards.push(...result)
	}

	if (!testCase.expected.head) {
		test.is(cards.length, 0)
		return
	}

	test.true(cards.length > 0)

	const head = await test.context.jellyfish.getCardById(
		test.context.session, cards[0].id)
	Reflect.deleteProperty(head, 'links')
	Reflect.deleteProperty(head, 'markers')

	const timeline = await test.context.jellyfish.query(
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

	test.deepEqual(Object.assign({}, testCase.expected.head, {
		id: head.id
	}), head)

	test.deepEqual(testCase.expected.tail.map((card, index) => {
		card.id = _.get(timeline, [ index, 'id' ])
		card.data.actor = test.context.actor.id
		card.data.target = head.id
		card.data.timestamp = _.get(timeline, [ index, 'data', 'timestamp' ])
		return card
	}), timeline.map((card) => {
		Reflect.deleteProperty(card, 'links')
		Reflect.deleteProperty(card, 'markers')

		if (card.data.payload) {
			Reflect.deleteProperty(card.data.payload, 'links')
			Reflect.deleteProperty(card.data.payload, 'markers')
		}

		return card
	}))
}

exports.integrations = {
	beforeEach: async (test) => {
		await exports.sync.beforeEach(test)

		await test.context.jellyfish.insertCard(test.context.session,
			require('../../../default-cards/contrib/external-event.json'))
		await test.context.jellyfish.insertCard(test.context.session,
			require('../../../default-cards/contrib/issue.json'))
		await test.context.jellyfish.insertCard(test.context.session,
			require('../../../default-cards/contrib/message.json'))
		await test.context.jellyfish.insertCard(test.context.session,
			require('../../../default-cards/contrib/whisper.json'))

		nock.disableNetConnect()
	},
	afterEach: async (test) => {
		await exports.sync.afterEach(test)

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
				ava.test.serial(`(${prefix}) ${testCaseName}`, async (test) => {
					await webhookScenario(test, {
						steps: testCase.steps.slice(slice),
						expected: testCase.expected,
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
						basePath: path.join(__dirname, 'integrations', suite.source),
						isAuthorized: _.partial(suite.isAuthorized, suite)
					})
				})
			}

			// TODO: Test shuffling the steps
		}
	}
}
