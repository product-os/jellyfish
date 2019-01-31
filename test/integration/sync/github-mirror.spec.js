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
const randomstring = require('randomstring')
const Octokit = require('@octokit/rest')
const packageJSON = require('../../../package.json')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.getIntegrationToken('github')

const getMirrorWaitSchema = (slug) => {
	return {
		type: 'object',
		required: [ 'id', 'type', 'slug', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: slug
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'mirrors' ],
				properties: {
					mirrors: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^https:\\/\\/github\\.com'
						}
					}
				}
			}
		}
	}
}

ava.before(async (test) => {
	await helpers.mirror.before(test)

	const [ owner, repo ] = environment.test.integration.github.repo.split('/')
	test.context.repository = {
		owner: owner.trim(),
		repo: repo.trim()
	}

	test.context.getIssueSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'issue'
		})
	}

	test.context.getMessageSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'message'
		})
	}

	test.context.createIssue = async (repository, slug, title, options) => {
		return test.context.executeThenWait(async () => {
			return test.context.sdk.card.create({
				name: title,
				slug,
				type: 'issue',
				version: '1.0.0',
				data: {
					repository: `${repository.owner}/${repository.repo}`,
					mentionsUser: [],
					alertsUser: [],
					description: options.body,
					status: options.status,
					archived: options.archived
				}
			})
		}, getMirrorWaitSchema(slug))
	}

	test.context.createMessage = async (target, slug, body) => {
		return test.context.executeThenWait(async () => {
			return test.context.sdk.event.create({
				target,
				type: 'message',
				slug,
				payload: {
					mentionsUser: [],
					alertsUser: [],
					message: body
				}
			})
		}, getMirrorWaitSchema(slug))
	}

	test.context.github = new Octokit({
		headers: {
			accept: 'application/vnd.github.v3+json',
			'user-agent': `${packageJSON.name} v${packageJSON.version} (${__dirname})`
		}
	})

	if (TOKEN) {
		test.context.github.authenticate({
			type: 'token',
			token: TOKEN.api
		})
	}
})

ava.after(helpers.mirror.after)
ava.beforeEach(async (test) => {
	await helpers.mirror.beforeEach(test, randomstring.generate().toLowerCase())
})

ava.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no GitHub token
const avaTest = TOKEN ? ava.serial : ava.serial.skip

avaTest('should be able to create an issue without comments', async (test) => {
	const slug = test.context.getIssueSlug()
	const title = `Test Issue ${randomstring.generate()}`
	const issue = await test.context.createIssue(
		test.context.repository, slug, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const mirror = issue.data.mirrors[0]
	const external = await test.context.github.issues.get({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		number: _.last(mirror.split('/'))
	})

	const currentUser = await test.context.github.users.getAuthenticated()
	test.is(external.data.user.login, currentUser.data.login)
	test.is(external.data.state, 'open')
	test.is(external.data.title, title)
	test.is(external.data.body, `[${test.context.username}] Issue body`)
	test.is(external.data.comments, 0)
	test.deepEqual(external.data.labels, [])
})

avaTest('should be able to create an issue with a comment', async (test) => {
	const issueSlug = test.context.getIssueSlug()
	const title = `Test Issue ${randomstring.generate()}`
	const issue = await test.context.createIssue(
		test.context.repository, issueSlug, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const messageSlug = test.context.getMessageSlug()
	await test.context.createMessage(issue, messageSlug, 'First comment')

	const mirror = issue.data.mirrors[0]
	const externalIssue = await test.context.github.issues.get({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		number: _.last(mirror.split('/'))
	})

	test.is(externalIssue.data.body, `[${test.context.username}] Issue body`)
	test.is(externalIssue.data.comments, 1)

	const externalMessages = await test.context.github.issues.listComments({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		number: externalIssue.data.number
	})

	const currentUser = await test.context.github.users.getAuthenticated()
	test.is(externalMessages.data.length, 1)
	test.is(externalMessages.data[0].body, `[${test.context.username}] First comment`)
	test.is(externalMessages.data[0].user.login, currentUser.data.login)
})
