/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const cheerio = require('cheerio')
const crypto = require('crypto')
const request = require('request')
const Bluebird = require('bluebird')
const utils = require('./utils')

const httpDiscourse = async (context, integrationOptions, method, url, options = {}) => {
	return new Bluebird((resolve, reject) => {
		context.log.info('Discourse API request', {
			method,
			url,
			options
		})

		const qs = Object.assign({}, options.query || {}, {
			api_key: integrationOptions.token.api,
			api_username: options.username || integrationOptions.token.username
		})

		request({
			method,
			baseUrl: options.baseUrl,
			body: options.body,
			useQuerystring: true,
			json: true,
			uri: url,
			qs
		}, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			if (response.statusCode >= 500) {
				const description = JSON.stringify(body, null, 2)
				const summary = `${response.statusCode} ${method} ${url}`
				return reject(new integrationOptions.errors.SyncExternalRequestError(
					`Discourse API error ${summary}: ${description}`))
			}

			return resolve({
				code: response.statusCode,
				body
			})
		})
	})
}

const getDiscourseResource = async (context, options, baseUrl, path) => {
	const result = await httpDiscourse(context, options, 'GET', path, {
		baseUrl
	})

	if (result.code === 404) {
		return null
	}

	if (result.code !== 200) {
		throw new options.errors.SyncExternalRequestError([
			`Couldn't get resource ${path}:`,
			JSON.stringify(result, null, 2)
		].join(' '))
	}

	return result.body
}

/**
 * @summary Get a Discourse user by its id
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - user id
 * @returns {(Object|Null)} Discourse user
 */
const getDiscourseUserById = async (context, options, baseUrl, id) => {
	return getDiscourseResource(
		context, options, baseUrl, `/admin/users/${id}.json`)
}

/**
 * @summary Get a Discourse topic by its id
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - topic id
 * @returns {(Object|Null)} Discourse topic
 */
const getDiscourseTopicById = async (context, options, baseUrl, id) => {
	return getDiscourseResource(
		context, options, baseUrl, `/t/${id}.json`)
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
 * @summary Check if an object is an event
 * @function
 * @private
 *
 * @param {Object} object - object
 * @returns {Boolean} whether the object is an event
 */
const isEvent = (object) => {
	return object.type === 'external-event' &&
		object.data &&
		object.data.headers &&
		object.data.payload
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
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Object} event - Discourse event
 * @returns {String} Topic mirror id
 */
const getTopicMirrorId = (baseUrl, event) => {
	const prefix = `${baseUrl}/t`

	if (!isEvent(event)) {
		if (event.topic_id) {
			return `${prefix}/${event.topic_id}`
		}

		return `${prefix}/${event.id}`
	}

	if (isTopicEvent(event)) {
		return `${prefix}/${event.data.payload.topic.id}`
	}

	return `${prefix}/${event.data.payload.post.topic_id}`
}

/**
 * @summary Get the mirror id of an event
 * @function
 * @private
 *
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Object} event - Discourse event
 * @returns {String} Mirror id
 */
const getMirrorId = (baseUrl, event) => {
	const topicUrl = getTopicMirrorId(baseUrl, event)

	if (!isEvent(event)) {
		if (event.post_number) {
			return `${topicUrl}/${event.post_number}`
		}

		return topicUrl
	}

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

const normalizeMessage = (string, baseUrl) => {
	/*
	 * Discourse does some post-processing of images
	 * server side after the event is emitted, adding
	 * some weird SVG decoration that we'll remove here.
	 */
	const dom = cheerio.load(string)
	dom('.lightbox .meta').remove()
	const html = dom.html()

	return utils.parseHTML(html, {
		baseUrl
	})

		/*
		 * The webhook events display attachments with relative URLs
		 * while the API adds a generic CDN base url. Lets prefer
		 * the attachment URL that uses the instance base URL.
		 */
		.replace(/https:\/\/discourse-cdn-(\w+)\.com\/business\d/gi, baseUrl)
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
				message: normalizeMessage(data.cooked, options.baseUrl)
			}
		}
	}
}

/**
 * @summary Get the actor type and slug from a Discourse payload
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Object} payload - Discourse payload
 * @returns {Object} user information
 */
const getActor = async (context, options, baseUrl, payload) => {
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
	const remoteUser = await getDiscourseUserById(
		context, options, baseUrl, userId)
	if (!remoteUser) {
		throw new options.errors.SyncNoActor(
			`No such user: ${userId}`)
	}

	return {
		slug: remoteUser.username,
		type: remoteUser.admin || remoteUser.moderator
			? 'user'
			: 'account'
	}
}

const getRemoteTopicData = async (context, options, event) => {
	const topicId = isTopicEvent(event)
		? event.data.payload.topic.id
		: event.data.payload.post.topic_id
	const data = await getDiscourseTopicById(
		context, options, getBaseUrl(event), topicId)
	if (!data) {
		throw new options.errors.SyncNoExternalResource(
			`The topic ${topicId} does not exist`)
	}

	return data
}

const getLocalElement = async (context, sequence, type, mirrorId) => {
	const fromIndex = _.findLastIndex(sequence, (entry) => {
		return entry.card.data.mirrors.includes(mirrorId)
	})

	if (fromIndex >= 0) {
		return Object.assign({}, sequence[fromIndex].card, {
			id: {
				$eval: `cards[${fromIndex}].id`
			}
		})
	}

	return context.getElementByMirrorId(type, mirrorId)
}

const processTopicData = async (sequence, mirrorId, topic, options) => {
	const topicCard = getThreadCard(mirrorId, topic)
	const threadCard = await getLocalElement(
		options.context, sequence, 'support-thread', mirrorId)

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
		? new Date((new Date(topic.last_posted_at)).getTime() + options.eventId)

		: new Date(topic.created_at)

	const newThreadCard = threadCard
		? Object.assign({}, _.cloneDeep(threadCard), {
			name: topicCard.name,
			tags: topicCard.tags
		})
		: _.cloneDeep(topicCard)

	if (!_.isEqual(threadCard, newThreadCard)) {
		sequence.push({
			time: topicUpsertDate,
			actor: options.actor,
			card: _.cloneDeep(newThreadCard)
		})
	}

	if (!threadCard) {
		newThreadCard.id = {
			$eval: `cards[${sequence.length - 1}].id`
		}
	}

	return newThreadCard
}

module.exports = class DiscourseIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
		this.baseUrl = 'https://forums.balena.io'
	}

	// eslint-disable-next-line class-methods-use-this
	async initialize () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	async mirror (card, options) {
		const actor = await this.context.getElementById(
			'user', options.actor)
		if (!actor) {
			return []
		}

		const username = actor.slug.replace(/^user-/g, '')

		const discourseUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, this.baseUrl)
		})

		this.context.log.info('Mirroring', {
			url: discourseUrl,
			remote: card
		})

		if (card.type === 'support-thread' && discourseUrl) {
			const remoteTopic = await httpDiscourse(
				this.context, this.options, 'GET', `${discourseUrl}.json`)
			if (remoteTopic.code !== 200) {
				throw new this.options.errors.SyncExternalRequestError(
					`Could not fetch Discourse topic: ${discourseUrl}`)
			}

			if (remoteTopic.body.title !== card.name ||
				!_.isEqual(remoteTopic.tags, card.tags)) {
				const body = {
					title: card.name
				}

				const query = {}
				if (_.isEmpty(card.tags)) {
					query['tags[]'] = '[]'
				} else {
					query['tags[]'] = card.tags
				}

				const topicId = _.last(discourseUrl.split('/'))
				const result = await httpDiscourse(
					this.context,
					this.options,
					'PUT',
					`${this.baseUrl}/t/-/${topicId}.json`, {
						username,
						body,
						query
					})

				if (result.code !== 200) {
					throw new this.options.errors.SyncExternalRequestError([
						`Could not update topic ${discourseUrl} as ${username}`,
						`with ${JSON.stringify(body, null, 2)}`
					].join(' '))
				}
			}

			return []
		}

		// We don't allow creating Discourse topics from Jellyfish yet
		if (card.type === 'support-thread' && !discourseUrl) {
			return []
		}

		if (card.type === 'message' || card.type === 'whisper') {
			const thread = await this.context.getElementById(
				'support-thread', card.data.target)
			if (!thread || thread.type !== 'support-thread') {
				return []
			}

			const threadDiscourseUrl = _.find(thread.data.mirrors, (mirror) => {
				return _.startsWith(mirror, this.baseUrl)
			})
			if (!threadDiscourseUrl) {
				return []
			}

			if (discourseUrl) {
				const topicResponse = await httpDiscourse(
					this.context, this.options, 'GET', `${discourseUrl}.json`)

				if (topicResponse.code === 404) {
					throw new this.options.errors.SyncNoExternalResource(
						`Could not find post ${discourseUrl}`)
				}

				if (topicResponse.code !== 200) {
					throw new this.options.errors.SyncExternalRequestError([
						`Could not find post ${discourseUrl}:`,
						JSON.stringify(topicResponse, null, 2)
					].join(' '))
				}

				const postId = _.parseInt(_.last(discourseUrl.split('/')))
				const postData = _.find(topicResponse.body.post_stream.posts, {
					post_number: postId
				})

				if (!postData) {
					throw new this.options.errors.SyncNoExternalResource(
						`Could not find post ${discourseUrl}`)
				}

				if (card.data.payload.message === utils.parseHTML(postData.cooked, {
					baseUrl: this.baseUrl
				})) {
					return []
				}

				const editResponse = await httpDiscourse(
					this.context,
					this.options,
					'PUT',
					`/posts/${postData.id}.json`, {
						baseUrl: this.baseUrl,
						username,
						body: {
							raw: card.data.payload.message
						}
					})

				if (editResponse.code !== 200) {
					throw new this.options.errors.SyncExternalRequestError([
						`Could not update comment ${topicResponse.body.id}`,
						`with content: ${card.data.payload.message}:`,
						JSON.stringify(editResponse, null, 2)
					].join(' '))
				}

				return []
			}

			const response = await httpDiscourse(
				this.context,
				this.options,
				'POST',
				`${this.baseUrl}/posts.json`, {
					username,
					body: {
						raw: card.data.payload.message,
						topic_id: _.parseInt(_.last(threadDiscourseUrl.split('/'))),
						created_at: card.created_at,

						// This has to be a stringified boolean,
						// otherwise it does not work.
						whisper: card.type === 'whisper' ? 'true' : 'false'
					}
				})

			if (response.code !== 200) {
				throw new this.options.errors.SyncExternalRequestError(
					`Could not create post: ${JSON.stringify(response, null, 2)}`)
			}

			card.data.mirrors = card.data.mirrors || []
			card.data.mirrors.push(getMirrorId(this.baseUrl, response.body))

			return [
				{
					time: new Date(),
					actor: options.actor,
					card
				}
			]
		}

		return []
	}

	async translate (event) {
		const sequence = []
		const baseUrl = getBaseUrl(event)

		const eventId = _.parseInt(event.data.headers['x-discourse-event-id'])
		const eventActor = await getActor(
			this.context, this.options, baseUrl, event.data.payload)
		const eventActorId = await this.context.getActorId(
			eventActor.type, eventActor.slug)

		const topicMirrorId = getTopicMirrorId(baseUrl, event)
		const remoteTopicData = await getRemoteTopicData(
			this.context, this.options, event)
		const topicActor = isTopicEvent(event)
			? eventActor
			: await getActor(
				this.context, this.options, baseUrl, remoteTopicData)
		const topicActorId = await this.context.getActorId(
			topicActor.type, topicActor.slug)

		if (isTopicEvent(event)) {
			await processTopicData(
				sequence, topicMirrorId, event.data.payload.topic, {
					actor: topicActorId,
					context: this.context,
					eventId
				})
		}

		const newThreadCard = await processTopicData(
			sequence,
			topicMirrorId,
			remoteTopicData, {
				actor: topicActorId,
				context: this.context,
				eventId
			})

		const posts = remoteTopicData.post_stream
			? await Bluebird.map(remoteTopicData.post_stream.posts, async (post) => {
				// Posts in the API stream are always active
				post.destroyed = false

				const postActor = await getActor(
					this.context, this.options, baseUrl, {
						post
					})
				post.actorId = await this.context.getActorId(
					postActor.type, postActor.slug)

				return post
			})
			: []
		if (isPostEvent(event)) {
			const apiPost = _.find(posts, {
				id: event.data.payload.post.id
			})

			// If webhook post is not known by the API then we assume
			// its a post we previously deleted
			event.data.payload.post.destroyed =
				event.data.headers['x-discourse-event'] === 'post_destroyed' || !apiPost
			event.data.payload.post.actorId = eventActorId

			if (!apiPost) {
				posts.push(event.data.payload.post)
			}

			// Only if necessary
			if (apiPost &&
				normalizeMessage(event.data.payload.post.cooked, baseUrl) !==
				normalizeMessage(apiPost.cooked, baseUrl)) {
				if (new Date(event.data.payload.post.updated_at) >
					new Date(apiPost.updated_at)) {
					posts.push(event.data.payload.post)
				}
			}
		}

		for (const post of posts) {
			const postMirrorId = getMirrorId(baseUrl, post)
			const postCard = getEventCard(postMirrorId, post, {
				actor: post.actorId,
				target: _.cloneDeep(newThreadCard),
				active: !post.destroyed,
				baseUrl
			})

			const eventCard =
				await this.context.getElementByMirrorId(postCard.type, postMirrorId)

			if (!eventCard) {
				sequence.push(...utils.postEvent(sequence, postCard, newThreadCard, {
					actor: post.actorId
				}))

				continue
			}

			const patchedCard = _.cloneDeep(eventCard)
			patchedCard.active = postCard.active
			patchedCard.data.payload.message = postCard.data.payload.message

			if (!_.isEqual(eventCard, patchedCard)) {
				sequence.push({
					time: new Date(post.updated_at),
					actor: patchedCard.data.actor,
					card: patchedCard
				})
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
