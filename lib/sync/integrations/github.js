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
const crypto = require('crypto')
const Octokit = require('@octokit/rest')
const Bluebird = require('bluebird')
const packageJSON = require('../../../package.json')

const getEventRoot = (event) => {
	return event.data.payload.issue || event.data.payload.pull_request
}

const getEventMirrorId = (event) => {
	return getEventRoot(event).html_url
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

const gatherPRInfo = (payload) => {
	const base = payload.pull_request.base
	const head = payload.pull_request.head
	return {
		base: {
			branch: base.ref,
			sha: base.sha
		},
		head: {
			branch: head.ref,
			sha: head.sha
		}
	}
}

const getIssueFromEvent = (event, options) => {
	const root = getEventRoot(event)
	if (event.data.payload.pull_request ||
		(event.data.payload.issue && event.data.payload.issue.pull_request)) {
		console.error(event)
		throw new Error('Issue is actually a PR')
	}

	const type = 'issue'

	const issue = {
		name: root.title,
		slug: `${type}-${normaliseRootID(root.node_id)}`,
		type,
		tags: root.labels.map((label) => {
			return label.name
		}),
		data: {
			repository: event.data.payload.repository.full_name,
			mirrors: [ getEventMirrorId(event) ],
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

const normaliseRootID = (id) => {
	return id.replace(/[=]/g, '').toLowerCase()
}

const eventToCardType = (event) => {
	return event.data.payload.pull_request ||
		(event.data.payload.issue && event.data.payload.issue.pull_request)
		? 'pull-request'
		: 'issue'
}

const makeCard = (card, time) => {
	let date = new Date()
	if (time) {
		date = new Date(time)
	}

	return {
		time: date,
		card
	}
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
		makeCard({
			slug,
			type: 'message',
			active: options.active,
			data
		}, options.time),
		makeCard({
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
		}, options.time)
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
					makeCard(card)
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

				return [ makeCard(card) ]
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

	async getPRFromEvent (event, options) {
		const root = getEventRoot(event)
		if (!(event.data.payload.pull_request ||
				(event.data.payload.issue && event.data.payload.issue.pull_request))) {
			console.error(JSON.stringify(event, null, 2))
			throw new Error('PR is actually an Issue')
		}
		const prData = await this.generatePRDataFromEvent(event)
		const type = 'pull-request'

		const pr = {
			name: root.title,
			slug: `${type}-${normaliseRootID(root.node_id)}`,
			type,
			tags: root.labels.map((label) => {
				return label.name
			}),
			data: _.merge({
				repository: event.data.payload.repository.full_name,
				mirrors: [ getEventMirrorId(event) ],
				mentionsUser: [],
				alertsUser: [],
				description: root.body || '',
				status: options.status,
				archived: false,
			}, prData)
		}

		if (options.id) {
			pr.id = options.id
		}

		return pr
	}

	async generatePRDataFromEvent (event) {
		let result = {}
		if (event.data.payload.pull_request) {
			result = gatherPRInfo(event.data.payload)
		} else {
			const pr = await this.github.pullRequests.get({
				owner: event.data.payload.organization.login,
				repo: event.data.payload.repository.name,
				number: event.data.payload.issue.number
			})
			result = gatherPRInfo(pr.data)
		}

		return result
	}

	async getCardFromEvent (event, options) {
		switch (eventToCardType(event)) {
			case 'issue':
				return getIssueFromEvent(event, options)
			case 'pull-request':
				return this.getPRFromEvent(event, options)
			case 'repository':
				return this.getRepoFromEvent(event, options)
			default:
				throw new Error('Unknown type')
		}
	}

	async closePRorIssue (event, type) {
		const issueMirrorId = getEventMirrorId(event)
		const issue = await this.getCardByMirrorId(issueMirrorId, type)
		const root = getEventRoot(event)

		if (issue) {
			if (issue.data.status === 'closed') {
				return []
			}

			issue.data.status = 'closed'

			return [ makeCard(issue, root.closed_at) ]
		}

		const prOpened = await this.getCardFromEvent(event, {
			status: 'open'
		})

		const prClosed = await this.getCardFromEvent(event, {
			status: 'closed',
			id: {
				$eval: 'cards[0].id'
			}
		})
		return [
			makeCard(prOpened, root.created_at)
		].concat(await this.getCommentsFromIssue(this.context, event, {
			$eval: 'cards[0].id'
		}, [])).concat([ makeCard(prClosed, root.closed_at) ])
	}

	async closePR (event) {
		return this.closePRorIssue(event, 'pull-request')
	}

	async createPRorIssueIfNotExists (event, type) {
		const mirrorID = getEventMirrorId(event)
		const existingCard = await this.getCardByMirrorId(mirrorID, type)
		const root = getEventRoot(event)

		if (existingCard) {
			return []
		}

		const card = await this.getCardFromEvent(event, {
			status: 'open'
		})

		return [ makeCard(card, root.created_at) ]
	}

	async getRepoCard (repo, options) {
		const mirrorID = repo.html_url
		const existingCard = await this.getCardByMirrorId(mirrorID, 'repository')

		if (existingCard) {
			return {
				repoInfo: {
					slug: existingCard.slug,
					target: {
						id: existingCard.id,
						type: 'repository'
					}
				},
				card: null
			}
		}
		const owner = repo.owner.login
		const name = repo.name
		const repoSlug = `repository-${owner}-${name}`
		const repoCard = {
			name: `${owner}/${name}`,
			slug: repoSlug,
			type: 'repository',
			tags: [],
			data: {
				owner,
				name,
				git_url: repo.git_url,
				html_url: mirrorID
			}
		}

		return {
			repoInfo: {
				slug: repoSlug,
				target: {
					id: {
						$eval: `cards[${options.index}].id`
					},
					type: 'repository'
				}
			},
			card: makeCard(repoCard, repo.created_at)
		}
	}

	async createPRIfNotExists (event) {
		const result = await this.createPRorIssueIfNotExists(event, 'pull-request')

		if (_.isEmpty(result)) {
			return []
		}
		const headPayload = event.data.payload.pull_request.head.repo
		const basePayload = event.data.payload.pull_request.base.repo

		let index = 1
		const head = (await this.getRepoCard(headPayload, { index }))
		// If we created the repository, increment the index for links and add
		// the card to the result
		if (head.card) {
			result.push(head.card)
			index++
		}
		const base = (await this.getRepoCard(basePayload, { index }))

		if (base.card) {
			if (_.isEqual(base.card, head.card)) {
				base.repoInfo.target.id.$eval = `cards[${--index}].id`
			} else {
				result.push(base.card)
			}
		}

		return result.concat([
			makeCard({
				name: 'has head at',
				slug: `link-${result[0].card.slug}-head-at-${head.repoInfo.slug}`,
				type: 'link',
				data: {
					inverseName: 'is head of',
					from: {
						id: {
							$eval: 'cards[0].id'
						},
						type: {
							$eval: 'cards[0].type'
						}
					},
					to: head.repoInfo.target
				}
			}),
			makeCard({
				name: 'has base at',
				slug: `link-${result[0].card.slug}-base-at-${base.repoInfo.slug}`,
				type: 'link',
				data: {
					inverseName: 'is base of',
					from: {
						id: {
							$eval: 'cards[0].id'
						},
						type: {
							$eval: 'cards[0].type'
						}
					},
					to: base.repoInfo.target
				}
			})
		])
	}

	async createPRWithConnectedIssues (event) {
		const mirrorID = getEventMirrorId(event)
		const cards = await this.createPRIfNotExists(event)
		if (_.isEmpty(cards)) {
			return []
		}
		const pr = cards[0].card

		const connectedIssue = _.chain(pr.data.description)
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
			const issueCard = await this.getCardByMirrorId(mirrorID, 'pull-request')
			if (issueCard) {
				cards.push(makeCard({
					name: 'is attached to',
					slug: `link-${pr.slug}-is-attached-to-${issueCard.slug}`,
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
				}))
			}
		}
		return cards
	}

	async labelPRorIssue (event, type, action) {
		const issueMirrorId = getEventMirrorId(event)
		const issue = await this.getCardByMirrorId(issueMirrorId, type)
		const root = getEventRoot(event)

		if (issue) {
			const card = await this.getCardFromEvent(event, {
				status: root.state
			})

			if (!_.isEqual(_.sortBy(card.tags), _.sortBy(issue.tags))) {
				card.id = issue.id
				return [ makeCard(card, root.updated_at) ]
			}

			return []
		}

		const sequence = []
		const card = await this.getCardFromEvent(event, {
			status: 'open'
		})

		const originalTags = _.clone(card.tags)

		if (action === 'labeled') {
			if (root.created_at === root.updated_at) {
				return [ makeCard(card, root.created_at) ]
			}

			card.tags = _.without(card.tags, event.data.payload.label.name)

			sequence.push(makeCard(card, root.created_at))

			if (root.state === 'closed') {
				const closedCard = makeCard(updateCardFromSequence(sequence, 0, {
					data: {
						status: 'closed'
					}
				}), root.closed_at)

				sequence.push(closedCard)
			}

			const updatedCard = updateCardFromSequence(sequence, sequence.length - 1, {
				tags: originalTags
			})

			return sequence.concat([ makeCard(updatedCard, root.updated_at) ])
		}

		sequence.push(makeCard(card, root.created_at))

		return sequence.concat([
			makeCard(updateCardFromSequence(sequence, 0, {
				tags: card.tags.concat(event.data.payload.label.name)
			}), new Date(root.updated_at) - 1),

			makeCard(updateCardFromSequence(sequence, 0, {
				tags: originalTags
			}), root.updated_at)
		])
	}

	async labelEventPR (event, action) {
		return this.labelPRorIssue(event, 'pull-request', action)
	}

	async createIssueIfNotExists (event) {
		return this.createPRorIssueIfNotExists(event, 'issue')
	}

	async closeIssue (event) {
		return this.closePRorIssue(event, 'issue')
	}

	async updateIssue (event, action) {
		const issueMirrorId = getEventMirrorId(event)
		const issue = await this.getCardByMirrorId(issueMirrorId, 'issue')
		const root = getEventRoot(event)

		if (issue) {
			const issueCard = await this.getCardFromEvent(event, {
				id: issue.id,
				status: 'open'
			})

			return [ makeCard(issueCard, root.updated_at) ]
		}

		const issueCard = await this.getCardFromEvent(revertEventChanges(event, 'issue'), {
			status: 'open'
		})

		const sequence = [ makeCard(issueCard, root.created_at) ]

		if (action === 'reopened') {
			const time = root.closed_at
				? root.closed_at
				: new Date(root.updated_at) - 1

			const closedCard = await this.getCardFromEvent(revertEventChanges(event, 'issue'), {
				status: 'closed',
				id: {
					$eval: 'cards[0].id'
				}
			})

			sequence.push(makeCard(closedCard, time))
		}

		const openCard = await this.getCardFromEvent(event, {
			status: 'open',
			id: {
				$eval: 'cards[0].id'
			}
		})

		return sequence.concat([ makeCard(openCard, root.updated_at) ])
	}

	async labelEventIssue (event, action) {
		return this.labelPRorIssue(event, 'issue', action)
	}

	async createIssueComment (event) {
		const issueMirrorId = getEventMirrorId(event)
		const type = eventToCardType(event)

		const issue = await this.getCardByMirrorId(issueMirrorId, type)
		const root = getEventRoot(event)

		if (await this.getCommentByMirrorId(getCommentMirrorIdFromEvent(event))) {
			return []
		}

		if (issue) {
			return getCommentFromEvent(this.context, event, {
				actor: this.options.actor,
				time: event.data.payload.comment.updated_at,
				target: issue.id,
				targetCard: issue,
				offset: 0,
				active: true
			})
		}

		// PR comments are treated as issue comments by github
		const openCard = await this.getCardFromEvent(event, {
			status: 'open'
		})

		const sequence = [ makeCard(openCard, root.created_at) ]

		if (root.state === 'closed') {
			const closedCard = updateCardFromSequence(sequence, 0, {
				data: {
					status: 'closed'
				}
			})

			sequence.push(makeCard(closedCard, root.closed_at))
		}

		const upserts = sequence.concat(await this.getCommentsFromIssue(this.context, event, {
			$eval: 'cards[0].id'
		}, [ getCommentMirrorIdFromEvent(event) ]))

		return upserts.concat(getCommentFromEvent(this.context, event, {
			actor: this.options.actor,
			time: event.data.payload.comment.created_at,
			offset: upserts.length,
			target: {
				$eval: 'cards[0].id'
			},
			targetCard: sequence[0].card,
			active: true
		}))
	}

	async editIssueComment (event) {
		const updateTime = event.data.payload.comment.updated_at

		const changes = {
			active: !event.data.payload.comment.deleted,
			data: {
				timestamp: new Date(updateTime).toISOString(),
				payload: {
					message: event.data.payload.comment.body
				}
			}
		}

		const commentMirrorId = getCommentMirrorIdFromEvent(event)
		const comment = await this.getCommentByMirrorId(commentMirrorId)
		if (comment) {
			return [ makeCard(_.merge(comment, changes), updateTime) ]
		}

		const issueMirrorId = getEventMirrorId(event)
		const type = eventToCardType(event)
		const issue = await this.getCardByMirrorId(issueMirrorId, type)
		const root = getEventRoot(event)
		const sequence = []

		if (!issue) {
			const openCard = await this.getCardFromEvent(event, {
				status: 'open'
			})

			sequence.push(makeCard(openCard, root.created_at))
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
				time: event.data.payload.comment.updated_at,
				active: true,
				offset: sequence.length,
				target,
				targetCard: issue || sequence[0].card
			})

			_.merge(upserts[0].card, changes)
			sequence.push(...upserts)
		} else {
			const time = event.data.payload.comment.updated_at
			sequence.push(makeCard(updateCardFromSequence(sequence, index, changes), time))
		}

		return sequence
	}

	async translate (event) {
		const type = event.data.headers['X-GitHub-Event'] ||
			event.data.headers['x-github-event']
		const action = event.data.payload.action

		switch (type) {
			case 'pull_request':
				switch (action) {
					case 'review_requested':
						return this.createPRIfNotExists(event)
					case 'opened':
					case 'assigned':
						return this.createPRWithConnectedIssues(event)
					case 'closed':
						return this.closePR(event)
					case 'labeled':
					case 'unlabeled':
						return this.labelEventPR(event, action)
					default:
						return []
				}
			case 'issues':
				switch (action) {
					case 'opened':
					case 'assigned':
						return this.createIssueIfNotExists(event)
					case 'closed':
						return this.closeIssue(event)
					case 'reopened':
					case 'edited':
						return this.updateIssue(event, action)
					case 'labeled':
					case 'unlabeled':
						return this.labelEventIssue(event, action)
					default:
						return []
				}

			case 'pull_request_review':
				switch (action) {
					case 'submitted':
						return this.createIssueIfNotExists(event)
					default:
						return []
				}

			case 'issue_comment':
				event.data.payload.comment.deleted = action === 'deleted'
				switch (action) {
					case 'created':
						return this.createIssueComment(event)
					case 'deleted':
						// Refactor a delete event to look like an edit on a
						// "deleted" property
						event.data.payload.comment.changes = {
							deleted: {
								from: false
							}
						}

						// Falls through
					case 'edited':
						return this.editIssueComment(event)
					default:
						return []
				}
			default:
				return []
		}
	}

	async getCardByMirrorId (id, type) {
		return this.context.getElementByMirrorId(type, id)
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
		const root = getEventRoot(event)
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

			return accumulator.concat([ makeCard(comment, payload.updated_at) ])
		}, [])
	}
}

module.exports.getLocalUser = async (event) => {
	return {
		type: 'user',
		username: event.data.payload.sender.login
	}
}

// See https://developer.github.com/webhooks/securing/
module.exports.isEventValid = (token, rawEvent, headers) => {
	const signature = headers['x-hub-signature']
	if (!signature) {
		return true
	}

	if (!token || !token.signature) {
		return false
	}

	const hash = crypto.createHmac('sha1', token.signature)
		.update(rawEvent)
		.digest('hex')
	return signature === `sha1=${hash}`
}
