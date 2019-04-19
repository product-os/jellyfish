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

/**
 * @summary Get a Discourse user by its id
 * @function
 * @private
 *
 * @param {Object} token - Discourse credentials
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - user id
 * @returns {(Object|Null)} Discourse user
 */
const getDiscourseUserById = async (token, baseUrl, id) => {
	return getDiscourseResource(token, baseUrl, `/admin/users/${id}.json`)
}

/**
 * @summary Get a Discourse topic by its id
 * @function
 * @private
 *
 * @param {Object} token - Discourse credentials
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - topic id
 * @returns {(Object|Null)} Discourse topic
 */
const getDiscourseTopicById = async (token, baseUrl, id) => {
	return getDiscourseResource(token, baseUrl, `/t/${id}.json`)
}

/**
 * @summary Get the Discourse base url from an event
 * @function
 * @private
 *
 * @param {Object} event - Discourse event
 * @returns {String} Discourse base URL
 */
const getBaseUrl = (event) => {
	return event.data.headers['x-discourse-instance']
}

/**
 * @summary Check if an event is about a topic
 * @function
 * @private
 *
 * @param {Object} event - Discourse event
 * @returns {Boolean} whether the event is a topic event
 */
const isTopicEvent = (event) => {
	return event.data.headers['x-discourse-event-type'] === 'topic'
}

/**
 * @summary Check if an event is about a postj
 * @function
 * @private
 *
 * @param {Object} event - Discourse event
 * @returns {Boolean} whether the event is a post event
 */
const isPostEvent = (event) => {
	return event.data.headers['x-discourse-event-type'] === 'post'
}

/**
 * @summary Get the mirror id of a topic event
 * @function
 * @private
 *
 * @param {Object} event - Discourse event
 * @returns {String} Topic mirror id
 */
const getTopicMirrorId = (event) => {
	const baseUrl = getBaseUrl(event)

	if (isTopicEvent(event)) {
		return `${baseUrl}/t/${event.data.payload.topic.id}`
	}

	return `${baseUrl}/t/${event.data.payload.post.topic_id}`
}

/**
 * @summary Get the mirror id of an event
 * @function
 * @private
 *
 * @param {Object} event - Discourse event
 * @returns {String} Mirror id
 */
const getMirrorId = (event) => {
	const topicUrl = getTopicMirrorId(event)
	if (isPostEvent(event)) {
		return `${topicUrl}/${event.data.payload.post.post_number}`
	}

	return topicUrl
}

/**
 * @summary Build a new thread card from topic data
 * @function
 * @private
 *
 * @param {String} mirrorId - topic mirror id
 * @param {Object} data - topic data
 * @returns {Object} thread card
 */
const getThreadCard = (mirrorId, data) => {
	return {
		name: data.title,
		tags: data.tags,
		links: {},
		markers: [],
		active: true,
		type: 'support-thread',
		slug: `support-thread-discourse-${data.id}`,
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
}

/**
 * @summary Build a new event card from post data
 * @function
 * @private
 *
 * @param {String} mirrorId - topic mirror id
 * @param {Object} data - post data
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @param {Boolean} options.active - active state
 * @param {Object} options.target - target card
 * @param {String} options.baseUrl - Discourse instance base URL
 * @returns {Object} event card
 */
const getEventCard = (mirrorId, data, options) => {
	const type = data.post_type === 4
		? 'whisper'
		: 'message'

	return {
		slug: [
			type,
			'discourse',
			data.topic_id,
			data.post_number
		].join('-'),
		type,
		tags: [],
		links: {},
		markers: [],
		active: options.active,
		data: {
			timestamp: data.created_at,
			actor: options.actor,
			target: options.target.id,
			mirrors: [ mirrorId ],
			payload: {
				mentionsUser: [],
				alertsUser: [],
				message: utils.parseHTML(data.cooked, {
					baseUrl: options.baseUrl
				})
			}
		}
	}
}

/**
 * @summary Get the actor type and slug from a Discourse payload
 * @function
 * @private
 *
 * @param {Object} token - Discourse credentials
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Object} payload - Discourse payload
 * @returns {Object} user information
 */
const getActor = async (token, baseUrl, payload) => {
	if (payload.post) {
		return {
			slug: payload.post.username,
			type: payload.post.admin || payload.post.staff
				? 'user'
				: 'account'
		}
	}

	const userId = payload.topic
		? payload.topic.created_by.id
		: payload.details.created_by.id
	const remoteUser = await getDiscourseUserById(token, baseUrl, userId)
	if (!remoteUser) {
		throw new Error(`No such user: ${userId}`)
	}

	return {
		slug: remoteUser.username,
		type: remoteUser.admin || remoteUser.moderator
			? 'user'
			: 'account'
	}
}

const getTopicData = async (token, event) => {
	if (isTopicEvent(event)) {
		return event.data.payload.topic
	}

	const topicId = event.data.payload.post.topic_id
	const data = await getDiscourseTopicById(
		token, getBaseUrl(event), topicId)
	if (!data) {
		throw new Error(
			`The topic ${topicId} does not exist`)
	}

	return data
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
		const sequence = []
		const baseUrl = getBaseUrl(event)

		const eventMirrorId = getMirrorId(event)
		const eventId = _.parseInt(event.data.headers['x-discourse-event-id'])
		const eventActor = await getActor(
			this.options.token, baseUrl, event.data.payload)
		const eventActorId = await this.context.getActorId(
			eventActor.type, eventActor.slug)

		const topicMirrorId = getTopicMirrorId(event)
		const topicData = await getTopicData(this.options.token, event)
		const topicCard = getThreadCard(topicMirrorId, topicData)
		const topicActor = isTopicEvent(event)
			? eventActor
			: await getActor(this.options.token, baseUrl, topicData)
		const topicActorId = await this.context.getActorId(
			topicActor.type, topicActor.slug)

		const threadCard =
			await this.context.getElementByMirrorId('support-thread', topicMirrorId)

		const topicUpsertDate = threadCard

			/*
			 * Discourse doesn't give us the date when an update to
			 * a topic happened, so i.e. given two events that add
			 * a tag to a topic, we don't know when they happened
			 * or which one came before.
			 *
			 * We can approximate the time when they happened using
			 * the date when the last message was posted, and we
			 * can add the incremental event id as milliseconds to
			 * that date as a workaround for distinguishing multiple
			 * topic edits without any new post in between.
			 */
			? new Date((new Date(topicData.last_posted_at)).getTime() + eventId)

			: new Date(topicData.created_at)

		const newThreadCard = threadCard
			? Object.assign({}, _.cloneDeep(threadCard), {
				name: topicCard.name,
				tags: topicCard.tags
			})
			: _.cloneDeep(topicCard)

		if (!_.isEqual(threadCard, newThreadCard)) {
			sequence.push({
				time: topicUpsertDate,
				actor: topicActorId,
				card: _.cloneDeep(newThreadCard)
			})
		}

		if (!threadCard) {
			newThreadCard.id = {
				$eval: `cards[${sequence.length - 1}].id`
			}
		}

		if (isPostEvent(event)) {
			const postCard = getEventCard(eventMirrorId, event.data.payload.post, {
				actor: eventActorId,
				target: _.cloneDeep(newThreadCard),
				active: event.data.headers['x-discourse-event'] !== 'post_destroyed',
				baseUrl
			})

			const eventCard =
				await this.context.getElementByMirrorId(postCard.type, eventMirrorId)

			if (eventCard) {
				const patchedCard = _.cloneDeep(eventCard)
				patchedCard.active = postCard.active
				patchedCard.data.payload.message = postCard.data.payload.message

				if (!_.isEqual(eventCard, patchedCard)) {
					sequence.push({
						time: new Date(event.data.payload.post.updated_at),
						actor: patchedCard.data.actor,
						card: patchedCard
					})
				}
			} else {
				sequence.push(...utils.postEvent(sequence, postCard, newThreadCard, {
					actor: eventActorId
				}))
			}
		}

		return sequence
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
