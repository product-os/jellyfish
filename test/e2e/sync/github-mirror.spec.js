/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const {
	retry
} = require('@octokit/plugin-retry')
const Octokit = require('@octokit/rest').Octokit.plugin(
	retry
)

const packageJSON = require('../../../package.json')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.github

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

ava.serial.before(async (test) => {
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
		request: {
			retries: 5
		},
		userAgent: `${packageJSON.name} v${packageJSON.version} (${__dirname})`,
		auth: TOKEN.api
	})
})

ava.serial.after(helpers.mirror.after)
ava.serial.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(test, uuid())
})

ava.serial.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no GitHub token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.serial.skip : ava.serial

avaTest('should be able to create an issue with a comment and update the comment after remote deletion', async (test) => {
	const issueSlug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, issueSlug, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const messageSlug = test.context.getMessageSlug()
	const message = await test.context.createMessage(issue, messageSlug, 'First comment')
	const mirror = message.data.mirrors[0]

	await test.context.github.issues.deleteComment({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		comment_id: _.last(_.split(mirror, '-'))
	})

	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: 'Edited message'
		}
	])

	const externalIssue = await test.context.github.issues.get({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		issue_number: _.last(issue.data.mirrors[0].split('/'))
	})

	test.is(externalIssue.data.body, `[${test.context.username}] Issue body`)
	test.is(externalIssue.data.comments, 0)

	const messageCard = await test.context.sdk.card.get(message.id)

	// Normal users can't see deleted cards
	test.falsy(messageCard)
})

avaTest('should be able to create an issue without comments', async (test) => {
	const slug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
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
		issue_number: _.last(mirror.split('/'))
	})

	const currentUser = await test.context.github.users.getAuthenticated()
	test.is(external.data.user.login, currentUser.data.login)
	test.is(external.data.state, 'open')
	test.is(external.data.title, title)
	test.is(external.data.body, `[${test.context.username}] Issue body`)
	test.is(external.data.comments, 0)
	test.deepEqual(external.data.labels, [])
})

avaTest('should sync issues given the mirror url if the repository changes', async (test) => {
	const slug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, slug, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	await test.context.sdk.card.update(issue.id, issue.type, [
		{
			op: 'replace',
			path: '/data/repository',
			value: `${test.context.repository.owner}/${test.context.repository.repo}-${uuid()}`
		}
	])

	const messageSlug = test.context.getMessageSlug()
	await test.context.createMessage(issue, messageSlug, 'First comment')

	const mirror = issue.data.mirrors[0]
	const external = await test.context.github.issues.get({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		issue_number: _.last(mirror.split('/'))
	})

	const currentUser = await test.context.github.users.getAuthenticated()
	test.is(external.data.user.login, currentUser.data.login)
	test.is(external.data.state, 'open')
	test.is(external.data.title, title)
	test.is(external.data.body, `[${test.context.username}] Issue body`)
	test.is(external.data.comments, 1)
	test.deepEqual(external.data.labels, [])
})

avaTest('should be able to create an issue with a comment', async (test) => {
	const issueSlug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
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
		issue_number: _.last(mirror.split('/'))
	})

	test.is(externalIssue.data.body, `[${test.context.username}] Issue body`)
	test.is(externalIssue.data.comments, 1)

	const externalMessages = await test.context.github.issues.listComments({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		issue_number: externalIssue.data.number
	})

	const currentUser = await test.context.github.users.getAuthenticated()
	test.is(externalMessages.data.length, 1)
	test.is(externalMessages.data[0].body, `[${test.context.username}] First comment`)
	test.is(externalMessages.data[0].user.login, currentUser.data.login)
})
