/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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
const prepareImport = require('../../../../lib/action-library/dist/sync/github')
const Worker = require('../../../../lib/worker/index')
const randomstring = require('randomstring')
const core = require('../../../../lib/core')

ava.test.beforeEach(async (test) => {
	// Create a jellyfish backend for "from state x it should y" tests
	const jellyfish = await core.create({
		backend: {
			host: process.env.DB_HOST,
			port: process.env.DB_PORT,
			database: `test_${randomstring.generate()}`
		}
	})
	await jellyfish.initialize()
	await jellyfish.insertCard(
		jellyfish.sessions.admin,
		require('../../../../default-cards/contrib/issue.json')
	)
	const worker = new Worker(jellyfish, jellyfish.sessions.admin, {})

	// Stash the basic details an action-library function uses
	test.context.session = jellyfish.sessions.admin
	test.context.context = worker.context
	test.context.args = {
		actorUUID: '01234567-89ab-cdef-0123-456789abcdef'
	}
	if (process.env.GITHUB_IMPORT_TEST_ACCESS_TOKEN) {
		test.context.args.auth = {
			type: 'token',
			token: process.env.GITHUB_IMPORT_TEST_ACCESS_TOKEN
		}
	}

	// Create and stash the card a new issue would create
	const issuePayload = require('./issue')
	test.context.issueExternalEvent = {
		data: {
			source: 'github',
			headers: {
				'x-github-event': 'issues'
			},
			payload: issuePayload
		}
	}

	// Create and stash the card a new big issue would create
	const bigIssuePayload = require('./big-issue')
	test.context.bigIssueExternalEvent = {
		data: {
			source: 'github',
			headers: {
				'x-github-event': 'issues'
			},
			payload: bigIssuePayload
		}
	}

	// Create and stash the card a new comment would create
	const commentPayload = require('./issue-comment')
	test.context.commentExternalEvent = {
		data: {
			source: 'github',
			headers: {
				'x-github-event': 'issue_comment'
			},
			payload: commentPayload
		}
	}

	// Create the JSON-E templated card for the head
	const headTemplate = {
		active: true,
		data: issuePayload.issue,
		links: {},
		tags: [],
		type: 'issue'
	}

	// Create the JSON-E templated card for the initiating message
	const messageTemplate = {
		active: true,
		data: {
			actor: test.context.args.actorUUID,
			payload: {
				message: issuePayload.issue.body
			},
			target: {
				$eval: '0.id'
			},
			timestamp: issuePayload.issue.created_at
		},
		links: {},
		tags: [],
		type: 'message'
	}

	// Create the JSON-E templated card for the reply
	const replyTemplate = {
		active: true,
		data: {
			actor: test.context.args.actorUUID,
			payload: {
				message: commentPayload.comment.body
			},
			target: {
				$eval: '0.id'
			},
			timestamp: commentPayload.comment.created_at
		},
		links: {},
		tags: [],
		type: 'message'
	}

	// Create and stash the JSON-E templated time-line for a head jellyfish doesn't know about
	test.context.fullTimeLine = [
		headTemplate,
		[
			messageTemplate,
			replyTemplate
		]
	]

	// Create the JSON-E templated time-line for a head jellyfish doesn't know about
	test.context.briefTimeLine = [
		[
			replyTemplate
		]
	]
})

ava.test(
	[
		'prepareImport()',
		'should provide a full time line',
		'when given a completely new issue'
	].join(' '),
	async (test) => {
		test.deepEqual(
			await prepareImport(
				test.context.session,
				test.context.context,
				test.context.issueExternalEvent,
				test.context.args
			),
			test.context.fullTimeLine
		)
	}
)

ava.test(
	[
		'prepareImport()',
		'should provide a full time line',
		'when given a completely new big issue'
	].join(' '),
	async (test) => {
		const result = await prepareImport(
			test.context.session,
			test.context.context,
			test.context.bigIssueExternalEvent,
			test.context.args
		)

		// The test issue in big-issue.json currently has 58 comments, and
		// I don't imagine this number will ever reduce much.
		// Most importantly this is greater than GitHub's pagination of 30.
		test.true(result[1].length > 45)

		// Also test that we haven't gone pagination crazy.
		test.true(result[1].length < 10 ** 3)
	}
)

ava.test(
	[
		'prepareImport()',
		'should provide a full time line',
		'when given a comment on an unknown issue'
	].join(' '),
	async (test) => {
		test.deepEqual(
			await prepareImport(
				test.context.session,
				test.context.context,
				test.context.commentExternalEvent,
				test.context.args
			),
			test.context.fullTimeLine
		)
	}
)

ava.test(
	[
		'prepareImport()',
		'should provide a brief time line',
		'when given a comment on a known issue'
	].join(' '),
	async (test) => {
		const issueTypeCard = await test.context.context.getCardBySlug(
			test.context.session,
			'issue'
		)
		const insertResult = await test.context.context.insertCard(
			test.context.session,
			issueTypeCard,
			{},
			test.context.fullTimeLine[0]
		)
		test.context.briefTimeLine[0][0].data.target = insertResult.id
		test.deepEqual(
			await prepareImport(
				test.context.session,
				test.context.context,
				test.context.commentExternalEvent,
				test.context.args
			),
			test.context.briefTimeLine
		)
	}
)
