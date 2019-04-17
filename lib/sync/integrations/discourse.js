/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const crypto = require('crypto')
const _ = require('lodash')
const request = require('request')
const Bluebird = require('bluebird')
const utils = require('./utils')

const getDiscourseUserById = async (token, baseUrl, id) => {
	return new Bluebird((resolve, reject) => {
		request({
			method: 'GET',
			baseUrl,
			json: true,
			uri: `/admin/users/${id}.json`,
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
					`Couldn't get user ${id}: ${JSON.stringify(body, null, 2)}`))
			}

			return resolve(body)
		})
	})
}

const getTopicId = (payload) => {
	if (payload.post) {
		return payload.post.topic_id
	}

	return payload.topic.id
}

const getTopicTitle = (payload) => {
	if (payload.post) {
		return payload.post.topic_title
	}

	return payload.topic.title
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

const getConversationMirrorUrl = (externalEvent) => {
	const baseUrl = externalEvent.data.headers['x-discourse-instance']
	const id = getTopicId(externalEvent.data.payload)
	return `${baseUrl}/t/${id}`
}

const getMessageMirrorUrl = (externalEvent) => {
	const conversationUrl = getConversationMirrorUrl(externalEvent)
	const messageId = externalEvent.data.payload.post.post_number
	return `${conversationUrl}/${messageId}`
}

const getThread = async (context, event) => {
	const mirrorId = getConversationMirrorUrl(event)
	const title = getTopicTitle(event.data.payload)
	const tags = event.data.payload.topic ? event.data.payload.topic.tags : []

	const threadCard =
		await context.getElementByMirrorId('support-thread', mirrorId)
	if (threadCard &&
		threadCard.name === title &&
		_.isEqual(threadCard.tags, tags)) {
		return threadCard
	}

	const result = _.merge(threadCard, {
		name: title,
		tags,
		links: {},
		markers: [],
		active: true,
		type: 'support-thread',
		slug: `support-thread-discourse-${getTopicId(event.data.payload)}`,
		data: {
			environment: 'production',
			inbox: 'S/Forums',
			mirrors: [ mirrorId ],
			mentionsUser: [],
			alertsUser: [],
			description: '',
			status: 'open'
		}
	})

	result.tags = tags
	return result
}

const getMessage = async (context, thread, event, actorId) => {
	const mirrorUrl = getMessageMirrorUrl(event)
	const type = event.data.payload.post.post_type === 4 ? 'whisper' : 'message'

	const text = utils.parseHTML(event.data.payload.post.cooked, {
		baseUrl: event.data.headers['x-discourse-instance']
	})

	const isActive = event.data.headers['x-discourse-event'] !== 'post_destroyed'

	const messageCard =
		await context.getElementByMirrorId(type, mirrorUrl)
	if (messageCard &&
		messageCard.data.payload.message === text &&
		messageCard.active === isActive) {
		return messageCard
	}

	const suffix = [
		getTopicId(event.data.payload),
		event.data.payload.post.post_number
	].join('-')

	return _.merge(messageCard, {
		slug: `${type}-discourse-${suffix}`,
		type,
		tags: [],
		links: {},
		markers: [],
		active: isActive,
		data: {
			timestamp: event.data.payload.post.created_at,
			actor: actorId,
			target: thread.id,
			mirrors: [ mirrorUrl ],
			payload: {
				mentionsUser: [],
				alertsUser: [],
				message: text
			}
		}
	})
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

	// eslint-disable-next-line class-methods-use-this
	async translate (event) {
		if (event.data.headers['x-discourse-event-type'] === 'post' ||
			(event.data.headers['x-discourse-event-type'] === 'topic' &&
				event.data.headers['x-discourse-event'] === 'topic_created')) {
			const cards = []
			const threadCard = await getThread(this.context, event)
			const actor = await getActor(this.options.token, event)
			const actorId = await this.context.getActorId(actor.type, actor.slug)

			const date = event.data.payload.post
				? event.data.payload.post.created_at
				: event.data.payload.topic.last_posted_at

			if (!threadCard.id) {
				cards.push({
					time: new Date(date),
					actor: actorId,
					card: _.cloneDeep(threadCard)
				})
				threadCard.id = {
					$eval: 'cards[0].id'
				}
			}

			if (event.data.headers['x-discourse-event-type'] !== 'post') {
				const mirrorId = getConversationMirrorUrl(event)
				const card =
					await this.context.getElementByMirrorId('support-thread', mirrorId)

				if (_.isString(threadCard.id) &&
					!_.isEqual(card.tags, threadCard.tags)) {
					cards.push({
						time: new Date(date),
						actor: actorId,
						card: _.cloneDeep(threadCard)
					})
				}

				return cards
			}

			const message = await getMessage(this.context, threadCard, event, actorId)
			return cards.concat(utils.postEvent(cards, message, threadCard, {
				actor: actorId
			}))
		}

		if (event.data.headers['x-discourse-event-type'] === 'topic' &&
			event.data.headers['x-discourse-event'] === 'topic_edited') {
			const cards = []
			const mirrorId = getConversationMirrorUrl(event)
			const card =
				await this.context.getElementByMirrorId('support-thread', mirrorId)
			const threadCard = await getThread(this.context, event)
			const actor = await getActor(this.options.token, event)
			const actorId = await this.context.getActorId(actor.type, actor.slug)

			if (!_.isEqual(card.tags, threadCard.tags) || card.name !== threadCard.name) {
				cards.push({
					// This is the best we can do as Discourse doesn't
					// give us the date when a title was updated
					time: new Date(event.data.payload.topic.last_posted_at),
					actor: actorId,
					card: _.cloneDeep(threadCard)
				})
			}

			return cards
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
