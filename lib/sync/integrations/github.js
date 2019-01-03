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

const _ = require('lodash')
const uuid = require('uuid/v4')
const Octokit = require('@octokit/rest')
const Bluebird = require('bluebird')
const packageJSON = require('../../../package.json')

const getIssueRoot = (event) => {
	return event.data.payload.issue || event.data.payload.pull_request
}

const getIssueMirrorIdFromEvent = (event) => {
	return getIssueRoot(event).html_url
}

const getCommentMirrorIdFromEvent = (event) => {
	return event.data.payload.comment.html_url
}

const revertEventChanges = (event, object) => {
	const previousEvent = _.cloneDeep(event)
	_.each(event.data.payload.changes, (value, key) => {
		previousEvent.data.payload[object][key] = value.from
	})

	Reflect.deleteProperty(previousEvent.data.payload, 'changes')
	return previousEvent
}

const updateCardFromSequence = (sequence, index, changes) => {
	const card = _.cloneDeep(sequence[index].card)
	_.merge(card, changes)
	card.id = {
		$eval: `cards[${index}].id`
	}

	return card
}

const getIssueFromEvent = (event, options) => {
	const root = getIssueRoot(event)
	const type = event.data.payload.pull_request ||
		(event.data.payload.issue && event.data.payload.issue.pull_request)
		? 'pull-request' : 'issue'

	const issue = {
		name: root.title,
		slug: `${type}-${root.node_id.replace(/[=]/g, '').toLowerCase()}`,
		type,
		tags: root.labels.map((label) => {
			return label.name
		}),
		data: {
			repository: event.data.payload.repository.full_name,
			mirrors: [ getIssueMirrorIdFromEvent(event) ],
			mentionsUser: [],
			alertsUser: [],
			description: root.body || '',
			status: options.status,
			archived: false
		}
	}

	if (options.id) {
		issue.id = options.id
	}

	return issue
}

const getCommentFromEvent = (context, event, options) => {
	const date = new Date(event.data.payload.comment.updated_at)

	const data = {
		mirrors: [ getCommentMirrorIdFromEvent(event) ],
		actor: options.actor,
		target: options.target,
		timestamp: date.toISOString(),
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message: event.data.payload.comment.body
		}
	}

	const slug = `message-${uuid()}`

	return [
		{
			time: options.time,
			card: {
				slug,
				type: 'message',
				active: options.active,
				data
			}
		},
		{
			time: options.time,
			card: {
				slug: `link-${slug}-is-attached-to-${options.targetCard.slug}`,
				type: 'link',
				name: 'is attached to',
				data: {
					inverseName: 'has attached element',
					from: {
						id: {
							$eval: `cards[${options.offset}].id`
						},
						type: 'message'
					},
					to: {
						id: options.target,
						type: options.targetCard.type
					}
				}
			}
		}
	]
}

module.exports = class GitHubIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
		this.github = new Octokit({
			headers: {
				accept: 'application/vnd.github.v3+json',
				'user-agent': `${packageJSON.name} v${packageJSON.version}`
			}
		})
	}

	async initialize () {
		this.github.authenticate({
			type: 'token',
			token: this.options.token.api
		})
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	async mirror (card) {
		const githubUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, 'https://github.com')
		})

		const actorCard = await this.context.getElementById('user', this.options.actor)
		const username = _.get(actorCard, [ 'slug' ], 'unknown').replace(/^user-/, '')
		const prefix = `[${username}]`

		if ((card.type === 'issue' || card.type === 'pull-request') && card.data.repository) {
			const [ owner, repository ] = card.data.repository.split('/')

			if (!githubUrl) {
				const result = await this.github.issues.create({
					owner,
					repo: repository,
					title: card.name,
					body: `${prefix} ${card.data.description}`,
					labels: card.tags
				})

				card.data.mirrors = card.data.mirrors || []
				card.data.mirrors.push(result.data.html_url)

				return [
					{
						time: new Date(),
						card
					}
				]
			}

			const result = await this.github.issues.get({
				owner,
				repo: repository,
				number: _.parseInt(_.last(githubUrl.split('/')))
			})

			if (result.data.state !== card.data.status ||
				result.data.body !== `${prefix} ${card.data.description}` ||
				result.data.title !== card.name ||
				!_.isEqual(_.map(result.data.labels, 'name'), card.tags)) {
				await this.github.issues.update({
					owner,
					repo: repository,
					number: _.parseInt(_.last(githubUrl.split('/'))),
					title: card.name,
					body: card.data.description,
					state: card.data.status,
					labels: card.tags
				})
			}

			return []
		}

		if (card.type === 'message') {
			const issue = await this.context.getElementById('issue', card.data.target)
			if (!issue || (issue.type !== 'issue' && issue.type !== 'pull-request')) {
				return []
			}

			const [ owner, repository ] = issue.data.repository.split('/')

			if (!githubUrl) {
				const issueGithubUrl = _.find(issue.data.mirrors, (mirror) => {
					return _.startsWith(mirror, 'https://github.com')
				})

				const result = await this.github.issues.createComment({
					owner,
					repo: repository,
					number: _.parseInt(_.last(issueGithubUrl.split('/'))),
					body: `${prefix} ${card.data.payload.message}`
				})

				card.data.mirrors = card.data.mirrors || []
				card.data.mirrors.push(result.data.html_url)

				return [
					{
						time: new Date(),
						card
					}
				]
			}

			const result = await this.github.issues.getComment({
				owner,
				repo: repository,
				comment_id: _.parseInt(_.last(githubUrl.split('-')))
			})

			if (result.data.body !== `${prefix} ${card.data.payload.message}`) {
				await this.github.issues.updateComment({
					owner,
					repo: repository,
					comment_id: result.data.id,
					body: card.data.payload.message
				})
			}

			return []
		}

		return []
	}

	async translate (event) {
		const type = event.data.headers['X-GitHub-Event'] ||
			event.data.headers['x-github-event']
		const action = event.data.payload.action

		if ((type === 'pull_request_review' && action === 'submitted') ||
			(type === 'pull_request' && action === 'review_requested')) {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)

			if (issue) {
				return []
			}

			const card = getIssueFromEvent(event, {
				status: 'open'
			})

			return [
				{
					time: new Date(root.created_at),
					card
				}
			]
		}

		if ((type === 'issues' || type === 'pull_request') && _.includes([ 'labeled', 'unlabeled' ], action)) {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)

			if (issue) {
				const card = getIssueFromEvent(event, {
					status: root.state
				})

				if (!_.isEqual(_.sortBy(card.tags), _.sortBy(issue.tags))) {
					card.id = issue.id
					return [
						{
							time: new Date(root.updated_at),
							card
						}
					]
				}

				return []
			}

			const sequence = []
			const card = getIssueFromEvent(event, {
				status: 'open'
			})

			const originalTags = _.clone(card.tags)

			if (action === 'labeled') {
				if (root.created_at === root.updated_at) {
					return [
						{
							time: new Date(root.created_at),
							card
						}
					]
				}

				card.tags = _.without(card.tags, event.data.payload.label.name)
				sequence.push({
					time: new Date(root.created_at),
					card
				})

				if (root.state === 'closed') {
					sequence.push({
						time: new Date(root.closed_at),
						card: updateCardFromSequence(sequence, 0, {
							data: {
								status: 'closed'
							}
						})
					})
				}

				return sequence.concat([
					{
						time: new Date(root.updated_at),
						card: updateCardFromSequence(sequence, sequence.length - 1, {
							tags: originalTags
						})
					}
				])
			}

			sequence.push({
				time: new Date(root.created_at),
				card
			})

			return sequence.concat([
				{
					time: new Date(new Date(root.updated_at) - 1),
					card: updateCardFromSequence(sequence, 0, {
						tags: card.tags.concat(event.data.payload.label.name)
					})
				},
				{
					time: new Date(root.updated_at),
					card: updateCardFromSequence(sequence, 0, {
						tags: originalTags
					})
				}
			])
		}

		if ((type === 'issues' || type === 'pull_request') && [
			'opened',
			'assigned'
		].includes(action)) {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const card = getIssueFromEvent(event, {
				status: 'open'
			})

			if (issue) {
				return []
			}

			const root = getIssueRoot(event)
			const cards = [
				{
					time: new Date(root.created_at),
					card
				}
			]

			if (type === 'pull_request') {
				const connectedIssue = _.chain(card.data.description)
					.split('\n')
					.map((line) => {
						return _.trim(line, ' \n')
					})
					.filter((line) => {
						return /^[\w-]+:/.test(line)
					})
					.map((line) => {
						return _.split(line, /\s*:\s*/)
					})
					.fromPairs()
					.get([ 'Connects-to' ])
					.value()

				if (connectedIssue) {
					const issueCard = await this.getIssueByMirrorId(issueMirrorId)
					if (issueCard) {
						cards.push({
							time: new Date(),
							card: {
								name: 'is attached to',
								slug: `link-${card.slug}-is-attached-to-${issueCard.slug}`,
								type: 'link',
								data: {
									inverseName: 'has attached',
									from: {
										id: {
											$eval: 'cards[0].id'
										},
										type: {
											$eval: 'cards[0].type'
										}
									},
									to: {
										id: issueCard.id,
										type: issueCard.type
									}
								}
							}
						})
					}
				}
			}

			return cards
		}

		if ((type === 'issues' || type === 'pull_request') && action === 'closed') {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)

			if (issue) {
				if (issue.data.status === 'closed') {
					return []
				}

				issue.data.status = 'closed'

				return [
					{
						time: new Date(root.closed_at),
						card: issue
					}
				]
			}

			return [
				{
					time: new Date(root.created_at),
					card: getIssueFromEvent(event, {
						status: 'open'
					})
				}
			].concat(await this.getCommentsFromIssue(this.context, event, {
				$eval: 'cards[0].id'
			}, [])).concat([
				{
					time: new Date(root.closed_at),
					card: getIssueFromEvent(event, {
						status: 'closed',
						id: {
							$eval: 'cards[0].id'
						}
					})
				}
			])
		}

		if (type === 'issues' && (action === 'edited' || action === 'reopened')) {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)

			if (issue) {
				return [
					{
						time: new Date(root.updated_at),
						card: getIssueFromEvent(event, {
							id: issue.id,
							status: 'open'
						})
					}
				]
			}

			const sequence = [
				{
					time: new Date(root.created_at),
					card: getIssueFromEvent(revertEventChanges(event, 'issue'), {
						status: 'open'
					})
				}
			]

			if (action === 'reopened') {
				sequence.push({
					time: root.closed_at
						? new Date(root.closed_at)
						: new Date(new Date(root.updated_at) - 1),
					card: getIssueFromEvent(revertEventChanges(event, 'issue'), {
						status: 'closed',
						id: {
							$eval: 'cards[0].id'
						}
					})
				})
			}

			return sequence.concat([
				{
					time: new Date(root.updated_at),
					card: getIssueFromEvent(event, {
						status: 'open',
						id: {
							$eval: 'cards[0].id'
						}
					})
				}
			])
		}

		if (type === 'issue_comment' && action === 'created') {
			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)

			if (await this.getCommentByMirrorId(getCommentMirrorIdFromEvent(event))) {
				return []
			}

			if (issue) {
				return getCommentFromEvent(this.context, event, {
					actor: this.options.actor,
					time: new Date(event.data.payload.comment.updated_at),
					target: issue.id,
					targetCard: issue,
					offset: 0,
					active: true
				})
			}

			const sequence = [
				{
					time: new Date(root.created_at),
					card: getIssueFromEvent(event, {
						status: 'open'
					})
				}
			]

			if (root.state === 'closed') {
				sequence.push({
					time: new Date(root.closed_at),
					card: updateCardFromSequence(sequence, 0, {
						data: {
							status: 'closed'
						}
					})
				})
			}

			const upserts = sequence.concat(await this.getCommentsFromIssue(this.context, event, {
				$eval: 'cards[0].id'
			}, [ getCommentMirrorIdFromEvent(event) ]))

			return upserts.concat(getCommentFromEvent(this.context, event, {
				actor: this.options.actor,
				time: new Date(event.data.payload.comment.created_at),
				offset: upserts.length,
				target: {
					$eval: 'cards[0].id'
				},
				targetCard: sequence[0].card,
				active: true
			}))
		}

		// Refactor a delete event to look like an edition on a
		// "deleted" property
		if (type === 'issue_comment') {
			event.data.payload.comment.deleted = action === 'deleted'
			if (action === 'deleted') {
				event.data.payload.comment.changes = {
					deleted: {
						from: false
					}
				}
			}
		}

		if (type === 'issue_comment' && [
			'edited',
			'deleted'
		].includes(action)) {
			const date = new Date(event.data.payload.comment.updated_at)

			const changes = {
				active: !event.data.payload.comment.deleted,
				data: {
					timestamp: date.toISOString(),
					payload: {
						message: event.data.payload.comment.body
					}
				}
			}

			const commentMirrorId = getCommentMirrorIdFromEvent(event)
			const comment = await this.getCommentByMirrorId(commentMirrorId)
			if (comment) {
				return [
					{
						time: date,
						card: _.merge(comment, changes)
					}
				]
			}

			const issueMirrorId = getIssueMirrorIdFromEvent(event)
			const issue = await this.getIssueByMirrorId(issueMirrorId)
			const root = getIssueRoot(event)
			const sequence = []

			if (!issue) {
				sequence.push({
					time: new Date(root.created_at),
					card: getIssueFromEvent(event, {
						status: 'open'
					})
				})
			}

			const target = issue ? issue.id : {
				$eval: `cards[${sequence.length - 1}].id`
			}

			const result = await this.getCommentsFromIssue(this.context, event, target, [])

			for (const item of result) {
				const githubUrl = _.find(item.card.data.mirrors, (mirror) => {
					return _.startsWith(mirror, 'https://github.com')
				})

				if (!githubUrl) {
					continue
				}

				if (!await this.getCommentByMirrorId(githubUrl)) {
					sequence.push(item)
				}
			}

			const index = _.findIndex(sequence, (element) => {
				return element.card.data.mirrors.includes(commentMirrorId)
			})

			if (index === -1) {
				const upserts = getCommentFromEvent(this.context, event, {
					actor: this.options.actor,
					time: new Date(event.data.payload.comment.updated_at),
					active: true,
					offset: sequence.length,
					target,
					targetCard: issue || sequence[0].card
				})

				_.merge(upserts[0].card, changes)
				sequence.push(...upserts)
			} else {
				sequence.push({
					time: new Date(event.data.payload.comment.updated_at),
					card: updateCardFromSequence(sequence, index, changes)
				})
			}

			return sequence
		}

		return []
	}

	async getIssueByMirrorId (id) {
		const result = await this.context.getElementByMirrorId('issue', id)
		if (result) {
			return result
		}

		return this.context.getElementByMirrorId('pull-request', id)
	}

	async getCommentByMirrorId (id) {
		return this.context.getElementByMirrorId('message', id)
	}

	async queryComments (owner, repository, issue, page = 1) {
		const response = await this.github.issues.listComments({
			owner,
			repo: repository,
			number: issue,
			per_page: 100,
			page
		})

		if (!this.github.hasNextPage(response)) {
			return response.data
		}

		const next = await this.queryComments(owner, repository, issue, page + 1)
		return response.data.concat(next)
	}

	async getCommentsFromIssue (context, event, target, mirrorBlacklist) {
		const root = getIssueRoot(event)
		const response = await this.queryComments(
			event.data.payload.repository.owner.login,
			event.data.payload.repository.name,
			root.number)

		return Bluebird.reduce(response, async (accumulator, payload) => {
			const mirrorId = payload.html_url
			if (mirrorBlacklist.includes(mirrorId)) {
				return accumulator
			}

			const date = new Date(payload.updated_at)
			const card = await this.getCommentByMirrorId(mirrorId)
			const data = {
				mirrors: _.get(card, [ 'data', 'mirrors' ]) || [ mirrorId ],
				actor: _.get(card, [ 'data', 'actor' ]) || this.options.actor,
				target,
				timestamp: date.toISOString(),
				payload: {
					mentionsUser: [],
					alertsUser: [],
					message: payload.body
				}
			}

			const comment = {
				slug: `message-${uuid()}`,
				type: 'message',
				active: !payload.deleted,
				data
			}

			if (card) {
				comment.id = card.id
			}

			return accumulator.concat([
				{
					time: new Date(payload.updated_at),
					card: comment
				}
			])
		}, [])
	}
}

module.exports.getLocalUser = async (event) => {
	return {
		type: 'user',
		username: event.data.payload.sender.login
	}
}

// TODO: Use GitHub signatures
module.exports.isEventValid = _.constant(true)
