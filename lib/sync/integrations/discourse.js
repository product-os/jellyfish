/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const crypto = require('crypto')
const request = require('request')
const Bluebird = require('bluebird')
const utils = require('./utils')

const getDiscourseResource = async (token, baseUrl, path) => {
	return new Bluebird((resolve, reject) => {
		request({
			method: 'GET',
			baseUrl,
			json: true,
			uri: path,
			qs: {
				api_key: token.api,
				api_username: token.username
			}
		}, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			if (response.statusCode === 404) {
				return resolve(null)
			}

			if (response.statusCode !== 200) {
				return reject(new Error(
					`Couldn't get resource ${path}: ${JSON.stringify(body, null, 2)}`))
			}

			return resolve(body)
		})
	})
}

const getDiscourseUserById = async (token, baseUrl, id) => {
	return getDiscourseResource(token, baseUrl, `/admin/users/${id}.json`)
}

const getDiscourseTopicById = async (token, baseUrl, id) => {
	return getDiscourseResource(token, baseUrl, `/t/${id}.json`)
}

const getActor = async (token, event) => {
	if (event.data.payload.post) {
		return {
			slug: event.data.payload.post.username,
			type: event.data.payload.post.admin || event.data.payload.post.staff
				? 'user'
				: 'account'
		}
	}

	const remoteUser = await getDiscourseUserById(
		token,
		event.data.headers['x-discourse-instance'],
		event.data.payload.topic.created_by.id)

	if (!remoteUser) {
		throw new Error(`No such user: ${event.data.payload.topic.created_by.id}`)
	}

	return {
		slug: remoteUser.username,
		type: remoteUser.admin || remoteUser.moderator
			? 'user'
			: 'account'
	}
}

const getMirrorId = (event) => {
	const baseUrl = event.data.headers['x-discourse-instance']
	if (event.data.payload.topic) {
		return `${baseUrl}/t/${event.data.payload.topic.id}`
	}

	const messageId = event.data.payload.post.post_number
	return `${baseUrl}/t/${event.data.payload.post.topic_id}/${messageId}`
}

const getTopicMirrorId = (event) => {
	if (event.data.payload.topic) {
		return getMirrorId(event)
	}

	const baseUrl = event.data.headers['x-discourse-instance']
	return `${baseUrl}/t/${event.data.payload.post.topic_id}`
}

module.exports = class DiscourseIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
	}

	// eslint-disable-next-line class-methods-use-this
	async initialize () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async mirror (card, options) {
		return []
	}

	async translate (event) {
		if (event.data.headers['x-discourse-event-type'] === 'topic') {
			const sequence = []
			const mirrorId = getMirrorId(event)
			const actor = await getActor(this.options.token, event)
			const actorId = await this.context.getActorId(actor.type, actor.slug)

			const threadCard =
				await this.context.getElementByMirrorId('support-thread', mirrorId)
			if (!threadCard) {
				sequence.push({
					time: new Date(event.data.payload.topic.created_at),
					actor: actorId,
					card: {
						name: event.data.payload.topic.title,
						tags: event.data.payload.topic.tags,
						links: {},
						markers: [],
						active: true,
						type: 'support-thread',
						slug: `support-thread-discourse-${event.data.payload.topic.id}`,
						data: {
							environment: 'production',
							inbox: 'S/Forums',
							mirrors: [ mirrorId ],
							mentionsUser: [],
							alertsUser: [],
							description: '',
							status: 'open'
						}
					}
				})

				return sequence
			}

			if (threadCard &&
				event.data.headers['x-discourse-event'] === 'topic_edited') {
				if (threadCard.name !== event.data.payload.topic.title ||
					!_.isEqual(threadCard.tags, event.data.payload.topic.tags)) {
					const newThread = _.cloneDeep(threadCard)
					newThread.name = event.data.payload.topic.title
					newThread.tags = event.data.payload.topic.tags
					sequence.push({
						time: new Date(event.data.payload.topic.last_posted_at),
						actor: actorId,
						card: newThread
					})
				}
			}

			return sequence
		}

		if (event.data.headers['x-discourse-event-type'] === 'post') {
			const sequence = []
			const topicMirrorId = getTopicMirrorId(event)
			let threadCard =
				await this.context.getElementByMirrorId('support-thread', topicMirrorId)

			if (!threadCard) {
				const topic = await getDiscourseTopicById(
					this.options.token,
					event.data.headers['x-discourse-instance'],
					event.data.payload.post.topic_id)

				if (!topic) {
					throw new Error(
						`The topic ${event.data.payload.post.topic_id} does not exist`)
				}

				const topicUser = await getDiscourseUserById(
					this.options.token,
					event.data.headers['x-discourse-instance'],
					topic.details.created_by.id)

				if (!topicUser) {
					throw new Error(
						`No such user: ${topic.details.created_by.id}`)
				}

				const topicUserType = topicUser.admin || topicUser.moderator
					? 'user'
					: 'account'

				const actorId = await this.context.getActorId(
					topicUserType, topicUser.username)

				sequence.push({
					time: new Date(topic.created_at),
					actor: actorId,
					card: {
						name: topic.title,
						tags: topic.tags,
						links: {},
						markers: [],
						active: true,
						type: 'support-thread',
						slug: `support-thread-discourse-${topic.id}`,
						data: {
							environment: 'production',
							inbox: 'S/Forums',
							mirrors: [ topicMirrorId ],
							mentionsUser: [],
							alertsUser: [],
							description: '',
							status: 'open'
						}
					}
				})

				threadCard = _.merge(_.cloneDeep(sequence[0].card), {
					id: {
						$eval: 'cards[0].id'
					}
				})
			}

			const mirrorId = getMirrorId(event)
			const eventType = event.data.payload.post.post_type === 4
				? 'whisper'
				: 'message'
			const eventCard =
				await this.context.getElementByMirrorId(eventType, mirrorId)

			if (!eventCard) {
				const actor = await getActor(this.options.token, event)
				const actorId = await this.context.getActorId(actor.type, actor.slug)

				const card = {
					slug: [
						eventType,
						'discourse',
						event.data.payload.post.topic_id,
						event.data.payload.post.post_number
					].join('-'),
					type: eventType,
					tags: [],
					links: {},
					markers: [],
					active: true,
					data: {
						timestamp: event.data.payload.post.created_at,
						actor: actorId,
						target: threadCard.id,
						mirrors: [ mirrorId ],
						payload: {
							mentionsUser: [],
							alertsUser: [],
							message: utils.parseHTML(event.data.payload.post.cooked, {
								baseUrl: event.data.headers['x-discourse-instance']
							})
						}
					}
				}

				sequence.push(...utils.postEvent(sequence, card, threadCard, {
					actor: actorId
				}))
			}

			if (eventCard &&
				(event.data.headers['x-discourse-event'] === 'post_edited' ||
					event.data.headers['x-discourse-event'] === 'post_destroyed' ||
					event.data.headers['x-discourse-event'] === 'post_recovered')) {
				const message = utils.parseHTML(event.data.payload.post.cooked, {
					baseUrl: event.data.headers['x-discourse-instance']
				})

				const isActive = event.data.headers['x-discourse-event'] !== 'post_destroyed'

				if (eventCard.active !== isActive || eventCard.data.payload.message !== message) {
					const newCard = _.cloneDeep(eventCard)
					newCard.active = isActive
					newCard.data.payload.message = message
					sequence.push({
						time: new Date(event.data.payload.post.updated_at),
						actor: newCard.data.actor,
						card: newCard
					})
				}
			}

			return sequence
		}

		return []
	}
}

module.exports.isEventValid = (token, rawEvent, headers) => {
	const signature = headers['x-discourse-event-signature']
	if (!signature) {
		return true
	}

	if (!token || !token.signature) {
		return false
	}

	const hash = crypto.createHmac('sha256', token.signature)
		.update(rawEvent)
		.digest('hex')

	return `sha256=${hash}` === signature
}
