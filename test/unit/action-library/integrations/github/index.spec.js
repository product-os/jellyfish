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

const ava = require('ava')
const _ = require('lodash')
const path = require('path')
const nock = require('nock')
const helpers = require('../../helpers')
const GitHubIntegration = require('../../../../../lib/action-library/integrations/github')
const sync = require('../../../../../lib/action-library/sync')

ava.test.beforeEach(async (test) => {
	await helpers.beforeEach(test)

	await test.context.jellyfish.insertCard(test.context.session,
		require('../../../../../default-cards/contrib/external-event.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../../../../default-cards/contrib/issue.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../../../../default-cards/contrib/message.json'))
})

ava.test.afterEach(helpers.afterEach)

const TEST_CASES = {
	'issue-open-close-open': {
		expected: require('./issue-open-close-open/expected.json'),
		steps: [
			require('./issue-open-close-open/01-issue-opened.json'),
			require('./issue-open-close-open/02-issue-closed.json'),
			require('./issue-open-close-open/03-issue-opened.json')
		]
	},
	unknown: {
		expected: require('./unknown/expected.json'),
		steps: [
			require('./unknown/01-unknown.json')
		]
	},
	'issue-open-without-body-lowercase-headers': {
		expected: require('./issue-open-without-body-lowercase-headers/expected.json'),
		steps: [
			require('./issue-open-without-body-lowercase-headers/01-issue-opened.json')
		]
	},
	'issue-close-label-toggle': {
		expected: require('./issue-close-label-toggle/expected.json'),
		steps: [
			require('./issue-close-label-toggle/01-issue-opened.json'),
			require('./issue-close-label-toggle/02-issue-closed.json'),
			require('./issue-close-label-toggle/03-issue-label.json'),
			require('./issue-close-label-toggle/04-issue-unlabel.json')
		]
	},
	'issue-open-label-toggle': {
		expected: require('./issue-open-label-toggle/expected.json'),
		steps: [
			require('./issue-open-label-toggle/01-issue-opened.json'),
			require('./issue-open-label-toggle/02-issue-label.json'),
			require('./issue-open-label-toggle/03-issue-unlabel.json')
		]
	},
	'issue-close-comment': {
		expected: require('./issue-close-comment/expected.json'),
		steps: [
			require('./issue-close-comment/01-issue-opened.json'),
			require('./issue-close-comment/02-issue-closed.json'),
			require('./issue-close-comment/03-issue-comment.json')
		]
	},
	'issue-delete-comment-with-missing-ref-which-is-still-returned': {
		expected: require('./issue-delete-comment-with-missing-ref-which-is-still-returned/expected.json'),
		steps: [
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/01-issue-opened.json'),
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/02-issue-comment.json'),
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/03-issue-comment-delete.json')
		]
	},
	'issue-delete-second-comment-with-missing-ref': {
		expected: require('./issue-delete-second-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-delete-second-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-delete-second-comment-with-missing-ref/02-issue-comment.json'),
			require('./issue-delete-second-comment-with-missing-ref/03-issue-comment-delete.json')
		]
	},
	'issue-delete-second-comment': {
		expected: require('./issue-delete-second-comment/expected.json'),
		steps: [
			require('./issue-delete-second-comment/01-issue-opened.json'),
			require('./issue-delete-second-comment/02-issue-comment.json'),
			require('./issue-delete-second-comment/03-issue-comment.json'),
			require('./issue-delete-second-comment/04-issue-comment-delete.json')
		]
	},
	'issue-edit-second-comment-with-missing-ref': {
		expected: require('./issue-edit-second-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-edit-second-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-edit-second-comment-with-missing-ref/02-issue-comment.json'),
			require('./issue-edit-second-comment-with-missing-ref/03-issue-comment-edit.json')
		]
	},
	'issue-edit-second-comment': {
		expected: require('./issue-edit-second-comment/expected.json'),
		steps: [
			require('./issue-edit-second-comment/01-issue-opened.json'),
			require('./issue-edit-second-comment/02-issue-comment.json'),
			require('./issue-edit-second-comment/03-issue-comment.json'),
			require('./issue-edit-second-comment/04-issue-comment-edit.json')
		]
	},
	'issue-delete-comment-with-missing-ref': {
		expected: require('./issue-delete-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-delete-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-delete-comment-with-missing-ref/02-issue-delete.json')
		]
	},
	'issue-comment-edit-with-missing-ref': {
		expected: require('./issue-comment-edit-with-missing-ref/expected.json'),
		steps: [
			require('./issue-comment-edit-with-missing-ref/01-issue-opened.json'),
			require('./issue-comment-edit-with-missing-ref/02-issue-comment-edit.json')
		]
	},
	'issue-closed-with-comment': {
		expected: require('./issue-closed-with-comment/expected.json'),
		steps: [
			require('./issue-closed-with-comment/01-issue-opened.json'),
			require('./issue-closed-with-comment/02-issue-comment.json'),
			require('./issue-closed-with-comment/03-issue-closed.json')
		]
	},
	'issue-comment-edit': {
		expected: require('./issue-comment-edit/expected.json'),
		steps: [
			require('./issue-comment-edit/01-issue-opened.json'),
			require('./issue-comment-edit/02-issue-comment.json'),
			require('./issue-comment-edit/03-issue-comment-edit.json')
		]
	},
	'issue-delete-comment': {
		expected: require('./issue-delete-comment/expected.json'),
		steps: [
			require('./issue-delete-comment/01-issue-opened.json'),
			require('./issue-delete-comment/02-issue-comment.json'),
			require('./issue-delete-comment/03-issue-delete.json')
		]
	},
	'issue-edit-body': {
		expected: require('./issue-edit-body/expected.json'),
		steps: [
			require('./issue-edit-body/01-issue-opened.json'),
			require('./issue-edit-body/02-issue-body-edit.json')
		]
	},
	'issue-edit-title': {
		expected: require('./issue-edit-title/expected.json'),
		steps: [
			require('./issue-edit-title/01-issue-opened.json'),
			require('./issue-edit-title/02-issue-title-edit.json')
		]
	},
	'issue-open-close': {
		expected: require('./issue-open-close/expected.json'),
		steps: [
			require('./issue-open-close/01-issue-opened.json'),
			require('./issue-open-close/02-issue-closed.json')
		]
	},
	'issue-open-with-assignee': {
		expected: require('./issue-open-with-assignee/expected.json'),
		steps: [
			require('./issue-open-with-assignee/01-issue-opened.json'),
			require('./issue-open-with-assignee/02-issue-assigned.json')
		]
	},
	'issue-open-with-comments': {
		expected: require('./issue-open-with-comments/expected.json'),
		steps: [
			require('./issue-open-with-comments/01-issue-opened.json'),
			require('./issue-open-with-comments/02-issue-comment.json'),
			require('./issue-open-with-comments/03-issue-comment.json')
		]
	},
	'issue-open-with-labels': {
		expected: require('./issue-open-with-labels/expected.json'),
		steps: [
			require('./issue-open-with-labels/01-issue-opened.json'),
			require('./issue-open-with-labels/02-issue-labeled.json'),
			require('./issue-open-with-labels/03-issue-labeled.json')
		]
	},
	'issue-open-without-body': {
		expected: require('./issue-open-without-body/expected.json'),
		steps: [
			require('./issue-open-without-body/01-issue-opened.json')
		]
	}
}

ava.beforeEach(() => {
	nock.disableNetConnect()
})

ava.afterEach(() => {
	nock.cleanAll()
})

const runScenario = async (test, token, steps, expected) => {
	const cards = []
	for (const step of steps) {
		const event = await test.context.jellyfish.insertCard(
			test.context.session, {
				type: 'external-event',
				active: true,
				tags: [],
				links: {},
				data: {
					source: 'github',
					headers: step.headers,
					payload: step.payload
				}
			})

		const result = await sync.translateExternalEvent(
			GitHubIntegration, event, {
				context: test.context.context,
				session: test.context.session,
				actor: test.context.actor.id,
				token
			})

		await test.context.flush(test.context.session)
		cards.push(...result)
	}

	if (!expected.head) {
		test.is(cards.length, 0)
		return
	}

	test.true(cards.length > 0)

	const head = await test.context.jellyfish.getCardById(
		test.context.session, cards[0].id)
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

	test.deepEqual(Object.assign({}, expected.head, {
		id: head.id
	}), head)

	test.deepEqual(expected.tail.map((card, index) => {
		card.id = _.get(timeline, [ index, 'id' ])
		card.data.actor = test.context.actor.id
		card.data.target = head.id
		card.data.timestamp = _.get(timeline, [ index, 'data', 'timestamp' ])
		return card
	}), timeline)
}

const setupNockStubs = (prefix, testCaseName, token) => {
	return nock('https://api.github.com')
		.persist()
		.get(/^\/repos\/.+\/.+\/issues\/\d+\/comments$/)
		.query(true)
		.reply(function (uri, request, callback) {
			if (!this.req.headers.authorization ||
					this.req.headers.authorization[0] !== `token ${token}`) {
				return callback(null, [ 401, this.req.headers ])
			}

			const stub = path.join(
				__dirname, testCaseName, prefix, `${_.kebabCase(uri)}.json`)
			try {
				return callback(null, [ 200, require(stub) ])
			} catch (error) {
				return callback(null, [ 404, stub ])
			}
		})
}

for (const testCaseName of Object.keys(TEST_CASES)) {
	const testCase = TEST_CASES[testCaseName]
	const token = 'xxxxxxxxxxxxxxxxxx'

	ava.test.serial(`(full) ${testCaseName}`, async (test) => {
		await setupNockStubs('full', testCaseName, token)
		await runScenario(test, token, testCase.steps, testCase.expected)
	})

	if (testCase.steps.length > 1) {
		const prefix = 'slice-1'
		ava.test.serial(`(${prefix}) ${testCaseName}`, async (test) => {
			await setupNockStubs(prefix, testCaseName, token)
			await runScenario(test, token, testCase.steps.slice(1), testCase.expected)
		})
	}

	if (testCase.steps.length > 2) {
		const prefix = 'slice-2'
		ava.test.serial(`(${prefix}) ${testCaseName}`, async (test) => {
			setupNockStubs(prefix, testCaseName, token)
			await runScenario(test, token, testCase.steps.slice(2), testCase.expected)
		})
	}

	// TODO: Test shuffling the steps
}
