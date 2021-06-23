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

const getSyncMessage = (targetId, message) => {
	return {
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				const: 'message@1.0.0'
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'object',
						required: [ 'message' ],
						properties: {
							message: {
								regexp: {
									pattern: message
								}
							}
						}
					}
				}
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id' ],
				properties: {
					id: {
						const: targetId
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

ava.serial.after.always(helpers.mirror.after)
ava.serial.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(test, uuid())
})

ava.serial.afterEach.always(helpers.mirror.afterEach)

// Skip all tests if there is no GitHub token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) || environment.test.integration.skip ? ava.serial.skip : ava.serial

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
	const slug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, slug, title, {
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

avaTest('linking a support/sales thread to an issue results in a message on that issue\'s timeline', async (test) => {
	const issueSlug = test.context.getIssueSlug()
	const title = `Test Issue ${uuid()}`
	const issue = await test.context.createIssue(
		test.context.repository, issueSlug, title, {
			body: 'Issue body',
			status: 'open',
			archived: false
		})

	const supportThread = await test.context.sdk.card.create({
		type: 'support-thread',
		name: 'test subject',
		data: {
			product: 'test-product',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	test.context.executeThenWait(async () => {
		return test.context.sdk.card.link(supportThread, issue, 'support thread is attached to issue')
	}, getSyncMessage(issue.id, 'This issue has attached support thread'))

	const mirror = issue.data.mirrors[0]

	const externalIssue = await test.context.github.issues.get({
		owner: test.context.repository.owner,
		repo: test.context.repository.repo,
		issue_number: _.last(mirror.split('/'))
	})

	await Bluebird.delay(5000)

	const externalMessages = await test.context.retry(() => {
		return test.context.github.issues.listComments({
			owner: test.context.repository.owner,
			repo: test.context.repository.repo,
			issue_number: externalIssue.data.number
		})
	}, (extMsgs) => {
		return _.get(extMsgs, [ 'data', 'length' ]) === 1
	})

	test.is(externalMessages.data[0].body, `[${test.context.username}] This issue has attached support thread https://jel.ly.fish/${supportThread.id}`)

	// TOOD: Remove all the code below once we are confident we don't re-trigger a message on unlinking

	// Now unlink the thread. We should not generate a second message
	await test.context.sdk.card.unlink(supportThread, issue, 'support thread is attached to issue')

	// Wait for a while to allow triggered actions to run.
	await Bluebird.delay(5000)

	const messages = await test.context.sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'message@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: issue.id
					}
				}
			}
		}
	})

	// There should still only be one message on this issue.
	test.is(messages.length, 1)
})
