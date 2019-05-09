/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const LRU = require('lru-cache')
const cheerio = require('cheerio')
const crypto = require('crypto')
const request = require('request')
const Bluebird = require('bluebird')
const utils = require('./utils')

/*
 * Discourse user cache, for rate limiting purposes.
 */
const DISCOURSE_USER_CACHE = new LRU(200)

const httpDiscourse = async (context, integrationOptions, method, url, options, retries = 8) => {
	const username = options.username || integrationOptions.token.username
	const result = await new Bluebird((resolve, reject) => {
		context.log.info('Discourse API request', {
			// For easy grouping purposes
			slug: `${username}-${method}-${url}`,

			method,
			url,
			username,
			options
		})

		const qs = Object.assign({}, options.query || {}, {
			api_key: integrationOptions.token.api,
			api_username: username
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

	if (result.code === 429 && result.body.error_type === 'rate_limit') {
		if (retries <= 0) {
			const description = JSON.stringify(result.body, null, 2)
			const summary = `${result.code} ${method} ${url}`
			throw new integrationOptions.errors.SyncRateLimit(
				`Rate limit hit ${summary}: ${description}`)
		}

		const seconds = result.body.extras.wait_seconds || 5
		await Bluebird.delay(seconds * 1000)
		return httpDiscourse(
			context, integrationOptions, method, url, options, retries - 1)
	}

	return result
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
	const cachedUser = DISCOURSE_USER_CACHE.get(id)
	if (cachedUser) {
		return cachedUser
	}

	const user = await getDiscourseResource(
		context, options, baseUrl, `/admin/users/${id}.json`)
	if (!user) {
		return null
	}

	DISCOURSE_USER_CACHE.set(id, user)
	DISCOURSE_USER_CACHE.set(user.username, user)
	return user
}

/**
 * @summary Get a Discourse user by its username
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {String} username - user name
 * @returns {(Object|Null)} Discourse user
 */
const getDiscourseUserByUsername = async (context, options, baseUrl, username) => {
	const cachedUser = DISCOURSE_USER_CACHE.get(username)
	if (cachedUser) {
		return cachedUser
	}

	const data = await getDiscourseResource(
		context, options, baseUrl, `/users/${username}.json`)
	if (!data) {
		return null
	}

	DISCOURSE_USER_CACHE.set(data.user.id, data.user)
	DISCOURSE_USER_CACHE.set(data.user.username, data.user)
	return data.user
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
 * @param {Object} [options] - options
 * @param {Boolean} [options.active] - whether the thread is active
 * @returns {Object} thread card
 */
const getThreadCard = (mirrorId, data, options = {}) => {
	return {
		name: data.title,
		tags: [],
		links: {},
		markers: [],
		active: _.isBoolean(options.active)
			? options.active
			: !data.deleted_at,
		type: 'support-thread',
		slug: `support-thread-discourse-${data.id}`,
		data: {
			environment: 'production',
			tags: data.tags,
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
	 * and links server side after the event is emitted,
	 * adding weird SVG and extra decoration that we'll
	 * remove here.
	 */
	const dom = cheerio.load(string)
	dom('.lightbox .meta').remove()
	dom('.quote .title').remove()
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
	const topicCard = getThreadCard(mirrorId, topic, {
		active: options.active
	})

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
		? new Date((new Date(
			topic.last_posted_at || topic.deleted_at)).getTime() + options.eventId)

		: new Date(topic.created_at)

	const newThreadCard = threadCard
		? Object.assign({}, _.cloneDeep(threadCard), {
			name: topicCard.name,
			active: topicCard.active
		})
		: _.cloneDeep(topicCard)
	newThreadCard.data.tags = topicCard.data.tags

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

const isInternalEvent = (event) => {
	if (isTopicEvent(event)) {
		// Don't sync private conversations or internal system
		// topics such as welcome messages, or spam notifications.
		if (event.data.payload.topic.archetype !== 'regular' ||
			event.data.payload.topic.pm_with_non_human_user) {
			return true
		}
	}

	// Negative user ids are special internal Discourse users.
	if (isPostEvent(event) && event.data.payload.post.user_id < 0) {
		return true
	}

	return false
}

const getTopicFromPostUrl = async (context, options, url) => {
	const topicResponse = await httpDiscourse(
		context, options, 'GET', `${url}.json`, {})

	if (topicResponse.code === 404) {
		throw new options.errors.SyncNoExternalResource(
			`Could not find topic from ${url}`)
	}

	if (topicResponse.code !== 200) {
		throw new options.errors.SyncExternalRequestError([
			`Could not get topic from ${url}:`,
			JSON.stringify(topicResponse, null, 2)
		].join(' '))
	}

	return topicResponse.body
}

const getPostFromPostUrl = async (context, options, url, times = 5) => {
	const topic = await getTopicFromPostUrl(context, options, url)
	const postId = _.parseInt(_.last(url.split('/')))
	const postData = _.find(topic.post_stream.posts, {
		post_number: postId
	})

	if (postData) {
		return postData
	}

	/*
	 * Looks like the post stream is eventually consistent
	 * and if we're fast enough, we can get to a place where
	 * a post exists, but is not in the topic's post stream.
	 *
	 * When that happens, the only thing we can do is retry
	 * fetching the topic after a bit, as we only know the
	 * positional number with regards to the topic and not
	 * the full id.
	 */
	if (times > 0) {
		await Bluebird.delay(2000)
		return getPostFromPostUrl(context, options, url, times - 1)
	}

	return null
}

const getPostData = async (context, options, url, postId, topic) => {
	const postData = _.find(topic.post_stream.posts, {
		post_number: postId
	})

	/*
	 * Lets make sure it really doesn't exist.
	 */
	if (!postData) {
		return getPostFromPostUrl(context, options, url)
	}

	return postData
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
				this.context, this.options, 'GET', `${discourseUrl}.json`, {})
			if (remoteTopic.code !== 200) {
				throw new this.options.errors.SyncExternalRequestError([
					`Could not fetch Discourse topic: ${discourseUrl},`,
					JSON.stringify(remoteTopic, null, 2)
				].join(' '))
			}

			if (remoteTopic.body.title !== card.name ||
				!_.isEqual(remoteTopic.tags, card.data.tags)) {
				const body = {
					title: card.name
				}

				// We can't update deleted topics
				if (!card.active) {
					return []
				}

				const query = {}
				if (_.isEmpty(card.data.tags)) {
					query['tags[]'] = '[]'
				} else {
					query['tags[]'] = card.data.tags
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
						`with ${JSON.stringify(body, null, 2)}:`,
						JSON.stringify(result, null, 2)
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
			if (!thread || thread.type !== 'support-thread' || !thread.active) {
				return []
			}

			const threadDiscourseUrl = _.find(thread.data.mirrors, (mirror) => {
				return _.startsWith(mirror, this.baseUrl)
			})
			if (!threadDiscourseUrl) {
				return []
			}

			if (discourseUrl) {
				const topicResponse = await getTopicFromPostUrl(
					this.context, this.options, discourseUrl)

				const postId = _.parseInt(_.last(discourseUrl.split('/')))
				const postData = await getPostData(
					this.context, this.options, discourseUrl, postId, topicResponse)
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
						`Could not update comment ${topicResponse.id}`,
						`with content: ${card.data.payload.message}:`,
						JSON.stringify(editResponse, null, 2)
					].join(' '))
				}

				return []
			}

			const remoteUser = await getDiscourseUserByUsername(
				this.context, this.options, this.baseUrl, username)

			// This likely means that a Jellyfish user doesn't have
			// a matching username in Discourse.
			if (!remoteUser) {
				const error = new this.options.errors.SyncNoActor(
					`The user ${username} does not exist in Discourse`)
				error.expected = true
				throw error
			}

			/*
			 * Turns out that trying to post a whisper when you
			 * don't have access to seeing whispers results in
			 * the message being public (?)
			 * See https://meta.discourse.org/t/116601
			 */
			if (card.type === 'whisper' &&
				!remoteUser.admin &&
				!remoteUser.moderator &&
				!remoteUser.staff) {
				throw new this.options.errors.SyncInvalidEvent(
					`${username} is not allowed to see or post whispers`)
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

			// A user error
			if (response.code === 422) {
				const error = new this.options.errors.SyncInvalidRequest(
					`Couldn't create post: ${response.body.errors[0]}`)
				error.expected = true
				throw error
			}

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

		if (isInternalEvent(event)) {
			return []
		}

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

					/*
					 * Override the active setting as sometimes Discourse
					 * will emit a "topic_destroyed" event while still
					 * claiming in the web hook details that the topic
					 * is active.
					 */
					active: event.data.headers['x-discourse-event'] !== 'topic_destroyed',

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
				post.destroyed = Boolean(post.deleted_at)

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
			const isDestroyedEvent =
				event.data.headers['x-discourse-event'] === 'post_destroyed'

			if (isDestroyedEvent) {
				event.data.payload.post.destroyed = true
			} else if (apiPost) {
				event.data.payload.post.destroyed = false
			} else {
				/*
				 * We've seen cases where posts that were just created
				 * do not appear on the topic post stream by the time
				 * the webhook is emitted. Therefore, we double check
				 * once more against the posts API before marking
				 * a post as deleted.
				 */
				const postResponse = await httpDiscourse(
					this.context,
					this.options,
					'GET',
					`/posts/${event.data.payload.post.id}.json`, {
						baseUrl: this.baseUrl
					})

				if (postResponse.code === 404) {
					throw new this.options.errors.SyncNoExternalResource(
						`The post ${event.data.payload.post.id} does not exist`)
				}

				if (postResponse.code !== 200) {
					throw new this.options.errors.SyncExternalRequestError([
						`Could not get post ${event.data.payload.post.id}:`,
						JSON.stringify(postResponse, null, 2)
					].join(' '))
				}

				event.data.payload.post.destroyed = Boolean(postResponse.body.deleted_at)
			}

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
