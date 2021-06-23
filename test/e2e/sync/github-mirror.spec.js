/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const {
	v4: uuid
} = require('uuid')
const randomWords = require('random-words')
const {
	retry
} = require('@octokit/plugin-retry')
const Octokit = require('@octokit/rest').Octokit.plugin(
	retry
)

const packageJSON = require('../../../package.json')
const helpers = require('./helpers')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const TOKEN = environment.integration.github

const getMirrorWaitSchema = (slug) => {
	return {
		type: 'object',
		required: [ 'slug', 'data' ],
		properties: {
			slug: {
				type: 'string',
				const: slug
			},
			data: {
				type: 'object',
				required: [ 'mirrors' ],
				properties: {
					mirrors: {
						type: 'array',
						minItems: 1,
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

	test.context.createIssue = async (repository, title, options) => {
		const issue = await test.context.sdk.card.create({
			name: title,
			slug: test.context.generateRandomSlug({
				prefix: 'issue'
			}),
			type: 'issue',
			data: {
				repository: `${repository.owner}/${repository.repo}`,
				description: options.body,
				status: options.status,
				archived: options.archived
			}
		})
		return test.context.waitForMatch(getMirrorWaitSchema(issue.slug))
	}

	test.context.createMessage = async (target, body) => {
		const message = await test.context.sdk.event.create({
			target,
			type: 'message',
			payload: {
				message: body
			}
		})
		return test.context.waitForMatch(getMirrorWaitSchema(message.slug))
	}

	test.context.github = new Octokit({
		request: {
			retries: 5
		},
		userAgent: `${packageJSON.name} v${packageJSON.version} (${__dirname})`,
		auth: TOKEN.api
	})
})

ava.after.always(helpers.mirror.after)
ava.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(test, uuid())
})

ava.afterEach.always(helpers.mirror.afterEach)

// Skip all tests if there is no GitHub token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) || environment.test.integration.skip ? ava.skip : ava

avaTest('should be able to create an issue with a comment and update the comment after remote deletion', async (test) => {
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const message = await test.context.createMessage(issue, 'First comment')
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

	await test.context.retry(() => {
		return test.context.github.issues.get({
			owner: test.context.repository.owner,
			repo: test.context.repository.repo,
			issue_number: _.last(issue.data.mirrors[0].split('/'))
		})
	}, (externalIssue) => {
		return _.isEqual(externalIssue.data.body, `[${test.context.username}] Issue body`) &&
			_.isEqual(externalIssue.data.comments, 0)
	})

	test.pass()
})

avaTest('should be able to create an issue without comments', async (test) => {
	const title = `Test Issue: ${randomWords(3).join(' ')}`
	const issue = await test.context.createIssue(
		test.context.repository, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const mirror = issue.data.mirrors[0]

	await Bluebird.delay(2000)

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
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, title, {
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

	await test.context.createMessage(issue, 'First comment')

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
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	await test.context.createMessage(issue, 'First comment')

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
