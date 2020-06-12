/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const LRU = require('lru-cache')
const crypto = require('crypto')
const Bluebird = require('bluebird')
const utils = require('./utils')
const assert = require('../../assert')

/*
 * Discourse category cache, for rate limiting purposes.
 */
const CATEGORIES = {}

/*
 * Discourse user cache, for rate limiting purposes.
 */
const DISCOURSE_USER_CACHE = new LRU(200)
const DISCOURSE_USER_EMAIL_CACHE = new LRU(200)

const httpDiscourse = async (context, integrationOptions, method, url, options, retries = 15) => {
	const username = options.username || integrationOptions.token.username

	context.log.info('Discourse API request', {
		// For easy grouping purposes
		slug: `${username}-${method}-${url}`,

		method,
		url,
		username,
		options
	})

	const qs = options.query || {}

	const headers = Object.assign({}, options.headers || {}, {
		'Api-Key': integrationOptions.token.api,
		'Api-Username': username
	})

	const result = await context.request(options.actor, {
		method,
		baseUrl: options.baseUrl,
		body: options.body,
		useQuerystring: true,
		json: true,
		uri: url,
		qs,
		headers
	})

	if (result.code === 429) {
		assert.INTERNAL(null, retries > 0,
			integrationOptions.errors.SyncRateLimit,
			() => {
				return `Rate limit hit ${result.code} ${method} ${url}: ${(JSON.stringify(result.body, null, 2))}`
			})

		const seconds = result.body.extras.wait_seconds || 5
		context.log.warn('Discourse rate limit retry', {
			retries,
			seconds
		})

		await Bluebird.delay(seconds * 1000)
		return httpDiscourse(
			context, integrationOptions, method, url, options, retries - 1)
	}

	// Discourse may be unavailable, so at least try a couple
	// of times before giving up.
	if (result.code >= 500) {
		assert.USER(null, retries > 0,
			integrationOptions.errors.SyncExternalRequestError,
			() => {
				return `Discourse unavailable ${result.code} ${method} ${url}: ${(JSON.stringify(result.body, null, 2))}`
			})

		context.log.warn('Discourse unavailable retry', {
			retries
		})

		await Bluebird.delay(5000)
		return httpDiscourse(
			context, integrationOptions, method, url, options, retries - 1)
	}

	// We saw some cases where the Discourse API reports
	// 403 "Request forbidden by administrative rules"
	// but it works fine again after a little while
	if (result.code === 403) {
		assert.USER(null, retries > 0,
			integrationOptions.errors.SyncExternalRequestError,
			() => {
				return `Discourse permission error ${result.code} ${method} ${url}: ${(JSON.stringify(result.body, null, 2))}`
			})

		context.log.warn('Discourse permission error retry', {
			retries
		})

		await Bluebird.delay(5000)
		return httpDiscourse(
			context, integrationOptions, method, url, options, retries - 1)
	}

	return result
}

const getCategoryNameById = async (context, options, baseUrl, actor, id) => {
	if (CATEGORIES[id]) {
		return CATEGORIES[id]
	}

	const result = await httpDiscourse(context, options, 'GET', '/categories.json', {
		baseUrl,
		actor
	})

	assert.INTERNAL(null, result.code === 200,
		options.errors.SyncExternalRequestError,
		() => {
			return `Couldn't get categories: ${JSON.stringify(result, null, 2)}`
		})

	for (const category of result.body.category_list.categories) {
		CATEGORIES[category.id] = category.name
	}

	return CATEGORIES[id]
}

const getDiscourseResource = async (context, actor, options, baseUrl, path) => {
	const result = await httpDiscourse(context, options, 'GET', path, {
		baseUrl,
		actor,
		query: options.query
	})

	if (result.code === 404) {
		return null
	}

	assert.INTERNAL(null, result.code === 200,
		options.errors.SyncExternalRequestError,
		() => {
			return `Couldn't get resource ${path}: ${JSON.stringify(result, null, 2)}`
		})

	return result.body
}

// Sometimes the email is not visible on the main user endpoints,
// but its accessible through this special URL.
const getDiscourseEmailByUsername = async (context, actor, options, baseUrl, username) => {
	const cachedEmail = DISCOURSE_USER_EMAIL_CACHE.get(username)
	if (cachedEmail) {
		return cachedEmail
	}

	const response = await getDiscourseResource(
		context, actor, options, baseUrl, `/u/${username}/emails.json`)
	if (!response || !response.email) {
		return null
	}

	DISCOURSE_USER_EMAIL_CACHE.set(username, response.email)
	return response.email
}

/**
 * @summary Get a Discourse user by its id
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {String} actor - actor
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - user id
 * @returns {(Object|Null)} Discourse user
 */
const getDiscourseUserById = async (context, actor, options, baseUrl, id) => {
	const cachedUser = DISCOURSE_USER_CACHE.get(id)
	if (cachedUser) {
		return cachedUser
	}

	const user = await getDiscourseResource(
		context, actor, options, baseUrl, `/admin/users/${id}.json`)
	if (!user) {
		return null
	}

	user.email = user.email || await getDiscourseEmailByUsername(
		context, actor, options, baseUrl, user.username)

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
 * @param {String} actor - actor
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {String} username - user name
 * @returns {(Object|Null)} Discourse user
 */
const getDiscourseUserByUsername = async (context, actor, options, baseUrl, username) => {
	const cachedUser = DISCOURSE_USER_CACHE.get(username)
	if (cachedUser) {
		return cachedUser
	}

	const data = await getDiscourseResource(
		context, actor, options, baseUrl, `/users/${username}.json`)
	if (!data) {
		return null
	}

	data.email = data.email || await getDiscourseEmailByUsername(
		context, actor, options, baseUrl, username)

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
 * @param {String} actor - actor
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Number} id - topic id
 * @returns {(Object|Null)} Discourse topic
 */
const getDiscourseTopicById = async (context, actor, options, baseUrl, id) => {
	return getDiscourseResource(
		context,
		actor,
		Object.assign({}, options, {
			query: {
				// Return up to 1000 posts in the post stream
				// https://docs.discourse.org/#tag/Topics%2Fpaths%2F~1t~1%7Bid%7D.json%2Fget
				print: true,

				// Always innclude the raw message data, otherwise we only get text that has been
				// parsed into HTML
				include_raw: 1
			}
		}),
		baseUrl,
		`/t/${id}.json`
	)
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
	return object.type &&
		object.type.split('@')[0] === 'external-event' &&
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
 * @summary Get the topic id of an event
 * @function
 * @private
 * @param {Object} event - Discourse event
 * @returns {String} Topic id
 */
const getTopicId = (event) => {
	if (!isEvent(event)) {
		if (event.topic_id) {
			return event.topic_id
		}

		return event.id
	}

	if (isTopicEvent(event)) {
		return event.data.payload.topic.id
	}

	return event.data.payload.post.topic_id
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
	const topicId = getTopicId(event)
	return `${prefix}/${topicId}`
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
		type: 'support-thread@1.0.0',
		slug: `support-thread-discourse-${data.id}`,
		data: {
			environment: 'production',
			tags: data.tags,
			inbox: options.category || 'S/Forums',
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
	 * The webhook events display attachments with relative URLs
	 * while the API adds a generic CDN base url. Lets prefer
	 * the attachment URL that uses the instance base URL.
	 */
	return string.replace(/https:\/\/discourse-cdn-(\w+)\.com\/business\d/gi, baseUrl)
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
		? 'whisper@1.0.0'
		: 'message@1.0.0'

	return {
		slug: [
			type.replace(/[@.]/g, '-'),
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
				message: normalizeMessage(data.raw, options.baseUrl)
			}
		}
	}
}

const parseFullName = (fullName) => {
	const nameWords = (fullName || '').split(' ')
	return {
		first: _.first(nameWords),
		last: _.tail(nameWords).join(' ')
	}
}

/**
 * @summary Get the actor type and slug from a Discourse payload
 * @function
 * @private
 *
 * @param {Object} context - integration context
 * @param {String} actor - actor
 * @param {Object} options - Discourse integration options
 * @param {String} baseUrl - Discourse instance base URL
 * @param {Object} payload - Discourse payload
 * @returns {Object} user information
 */
const getActor = async (context, actor, options, baseUrl, payload) => {
	const userId =
		_.get(payload, [ 'post', 'user_id' ]) ||
		_.get(payload, [ 'topic', 'created_by', 'id' ]) ||
		_.get(payload, [ 'details', 'created_by', 'id' ]) ||

		// This means that the user was completely deleted from the system
		// without any trail, so we can't know who the real author of this
		// post was, and Discourse claims that it belongs to the user that
		// deleted it, which is usually the "system" user.
		(!_.get(payload, [ 'post', 'username' ]) &&
			_.get(payload, [ 'post', 'deleted_by', 'id' ]))

	const username = _.get(payload, [ 'post', 'username' ])

	assert.INTERNAL(null, userId || username,
		options.errors.SyncNoActor,
		() => {
			return `No user id in payload: ${JSON.stringify(payload, null, 2)}`
		})

	const remoteUser = userId
		? await getDiscourseUserById(
			context, actor, options, baseUrl, userId)
		: await getDiscourseUserByUsername(
			context, actor, options, baseUrl, username)

	context.log.info('Getting Discourse actor', {
		id: userId,
		data: remoteUser
	})

	// Handle the case where we get a post message event
	// but the user is deleted by the time we go fetch
	// its user by id, and if so, just approximate the
	// data as best as we can with the information we
	// have in the payload.
	const userDetails = (payload.topic && payload.topic.created_by) ||
		(payload.details && payload.details.created_by)
	if (!remoteUser && payload.post) {
		return {
			slug: payload.post.username,
			name: parseFullName(payload.post.name),
			email: await getDiscourseEmailByUsername(
				context, actor, options, baseUrl, payload.post.username),
			active: false,
			type: 'user@1.0.0'
		}
	} else if (!remoteUser && userDetails) {
		return {
			slug: userDetails.username,
			name: parseFullName(userDetails.name),
			active: false,
			type: 'user@1.0.0'
		}
	}

	assert.INTERNAL(null, remoteUser,
		options.errors.SyncNoActor,
		`No such user: ${userId}`)

	return {
		slug: remoteUser.username,
		name: parseFullName(remoteUser.name),
		email: remoteUser.email,
		title: remoteUser.title,
		active: true,
		type: 'user@1.0.0'
	}
}

const getRemoteTopicData = async (context, actor, options, event) => {
	const topicId = isTopicEvent(event)
		? event.data.payload.topic.id
		: event.data.payload.post.topic_id
	const data = await getDiscourseTopicById(
		context, actor, options, getBaseUrl(event), topicId)
	assert.INTERNAL(null, data,
		options.errors.SyncNoExternalResource,
		`The topic ${topicId} does not exist`)

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
		active: options.active,
		category: await getCategoryNameById(
			options.context,
			options.options,
			options.baseUrl,
			options.actor,
			topic.category_id)
	})

	const threadCard = await getLocalElement(
		options.context, sequence, 'support-thread@1.0.0', mirrorId)

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

const getTopicFromPostUrl = async (context, actor, options, url) => {
	const topicResponse = await httpDiscourse(
		context, options, 'GET', `${url}.json`, {
			actor
		})

	assert.INTERNAL(null, topicResponse.code !== 404,
		options.errors.SyncNoExternalResource,
		`Could not find topic from ${url}`)
	assert.INTERNAL(null, topicResponse.code === 200,
		options.errors.SyncExternalRequestError,
		() => {
			return `Could not get topic from ${url}: ${JSON.stringify(topicResponse, null, 2)}`
		})

	return topicResponse.body
}

const getPostFromPostUrl = async (context, actor, options, url, times = 10) => {
	const topic = await getTopicFromPostUrl(context, actor, options, url)
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
		return getPostFromPostUrl(context, actor, options, url, times - 1)
	}

	return null
}

const getPostData = async (context, actor, options, url, postId, topic) => {
	const postData = _.find(topic.post_stream.posts, {
		post_number: postId
	})

	/*
	 * Lets make sure it really doesn't exist.
	 */
	if (!postData) {
		return getPostFromPostUrl(context, actor, options, url)
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
		if (!this.options.token ||
			!this.options.token.username ||
			!this.options.token.api) {
			return []
		}

		const actor = await this.context.getElementById(options.actor)
		if (!actor) {
			return []
		}

		const username = this.context.getRemoteUsername(
			actor.slug.replace(/^user-/g, ''))

		const discourseUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, this.baseUrl)
		})

		this.context.log.info('Mirroring', {
			url: discourseUrl,
			remote: card
		})

		const baseType = card.type.split('@')[0]

		if (baseType === 'support-thread' && discourseUrl) {
			const remoteTopic = await httpDiscourse(
				this.context, this.options, 'GET', `${discourseUrl}.json`, {
					actor: options.actor
				})

			assert.INTERNAL(null, remoteTopic.code === 200,
				this.options.errors.SyncExternalRequestError, () => {
					return [
						`Could not fetch Discourse topic: ${discourseUrl},`,
						JSON.stringify(remoteTopic, null, 2)
					].join(' ')
				})

			if (remoteTopic.body.title !== card.name ||
				!_.isEqual(remoteTopic.body.tags, card.data.tags || [])) {
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
						actor: options.actor,
						body,
						query
					})

				assert.INTERNAL(null, result.code === 200,
					this.options.errors.SyncExternalRequestError, () => {
						return [
							`Could not update topic ${discourseUrl} as ${username}`,
							`with ${JSON.stringify(body, null, 2)}:`,
							JSON.stringify(result, null, 2)
						].join(' ')
					})
			}

			return []
		}

		// We don't allow creating Discourse topics from Jellyfish yet
		if (baseType === 'support-thread' && !discourseUrl) {
			return []
		}

		if (baseType === 'message' || baseType === 'whisper') {
			const thread = await this.context.getElementById(card.data.target)
			if (!thread || thread.type.split('@')[0] !== 'support-thread' || !thread.active) {
				return []
			}

			const threadDiscourseUrl = _.find(thread.data.mirrors, (mirror) => {
				return _.startsWith(mirror, this.baseUrl)
			})
			if (!threadDiscourseUrl) {
				return []
			}

			const remoteUser = await getDiscourseUserByUsername(
				this.context, options.actor, this.options,
				this.baseUrl, username)

			// This likely means that a Jellyfish user doesn't have
			// a matching username in Discourse.
			assert.USER(null, remoteUser,
				this.options.errors.SyncNoActor,
				`The user ${username} does not exist in Discourse`)

			/*
			 * Turns out that trying to post a whisper when you
			 * don't have access to seeing whispers results in
			 * the message being public (?)
			 * See https://meta.discourse.org/t/116601
			 */
			const isAllowed =
				baseType !== 'whisper' ||
				remoteUser.admin ||
				remoteUser.moderator ||
				remoteUser.staff

			/*
			 * If the user is not allowed the post the message, then
			 * we do so as the integration user, putting the name of
			 * the real user in brackets.
			 */
			const messageUsername = isAllowed
				? username
				: this.options.token.username
			const messageBody = isAllowed
				? card.data.payload.message
				: [
					`(${username}) ${card.data.payload.message}`,
					`\n\n***\n\n> This message was posted as @${messageUsername}`,
					`because @${username} is not a Discourse moderator`
				].join(' ')

			if (discourseUrl) {
				const topicResponse = await getTopicFromPostUrl(
					this.context, options.actor, this.options, discourseUrl)

				const postId = _.parseInt(_.last(discourseUrl.split('/')))
				const postData = await getPostData(
					this.context, options.actor, this.options,
					discourseUrl, postId, topicResponse)
				assert.INTERNAL(null, postData,
					this.options.errors.SyncNoExternalResource,
					`Could not find post ${discourseUrl}`)

				if (card.data.payload.message === postData.raw) {
					return []
				}

				const editResponse = await httpDiscourse(
					this.context,
					this.options,
					'PUT',
					`/posts/${postData.id}.json`, {
						baseUrl: this.baseUrl,
						username: messageUsername,
						actor: options.actor,
						body: {
							raw: messageBody
						}
					})

				if (editResponse.code === 403) {
					const error = new this.options.errors.SyncPermissionsError(
						'You don\'t have permissions to update this post on Discourse')
					error.expected = true
					throw error
				}

				assert.INTERNAL(null, editResponse.code === 200,
					this.options.errors.SyncExternalRequestError, () => {
						return [
							`Could not update comment ${topicResponse.id}`,
							`with content: ${card.data.payload.message}:`,
							JSON.stringify(editResponse, null, 2)
						].join(' ')
					})

				return []
			}

			const topicResponse = await httpDiscourse(
				this.context,
				this.options,
				'GET',
				threadDiscourseUrl, {
					actor: options.actor
				})

			assert.INTERNAL(null, topicResponse.code === 200,
				this.options.errors.SyncExternalRequestError, () => {
					return [
						`Could not get topic ${threadDiscourseUrl}:`,
						JSON.stringify(topicResponse, null, 2)
					].join(' ')
				})

			// We don't mirror posts to deleted topics, but we still let
			// them get into Jellyfish, so we can post summaries, etc.
			if (topicResponse.body.deleted_at) {
				return []
			}

			const response = await httpDiscourse(
				this.context,
				this.options,
				'POST',
				`${this.baseUrl}/posts.json`, {
					username: messageUsername,
					actor: options.actor,
					body: {
						raw: messageBody,
						topic_id: _.parseInt(_.last(threadDiscourseUrl.split('/'))),
						created_at: card.created_at,

						// This has to be a stringified boolean,
						// otherwise it does not work.
						whisper: baseType === 'whisper' ? 'true' : 'false'
					}
				})

			// A user error
			assert.USER(null, response.code !== 422,
				this.options.errors.SyncInvalidRequest,
				() => {
					return `Couldn't create post: ${JSON.stringify(response, null, 2)}`
				})

			assert.INTERNAL(null, response.code === 200,
				this.options.errors.SyncExternalRequestError,
				() => {
					return `Could not create post: ${JSON.stringify(response, null, 2)}`
				})

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

	async translate (event, options) {
		if (!this.options.token ||
			!this.options.token.username ||
			!this.options.token.api) {
			return []
		}

		const sequence = []
		const baseUrl = getBaseUrl(event)

		if (isInternalEvent(event)) {
			return []
		}

		// The "post_stream" property is huge and adds a lot of noise
		// to the logs. We can safely remove it here as we never use it.
		Reflect.deleteProperty(event.data.payload, 'post_stream')

		const eventId = _.parseInt(event.data.headers['x-discourse-event-id'])
		const eventActor = await getActor(
			this.context, options.actor, this.options, baseUrl, event.data.payload)
		const eventActorId = await this.context.getActorId({
			active: eventActor.active,
			handle: eventActor.slug,
			name: eventActor.name,
			email: eventActor.email,
			title: eventActor.title
		})

		const topicMirrorId = getTopicMirrorId(baseUrl, event)
		const remoteTopicData = await getRemoteTopicData(
			this.context, options.actor, this.options, event)
		const topicActor = isTopicEvent(event)
			? eventActor
			: await getActor(
				this.context, options.actor, this.options, baseUrl, remoteTopicData)
		const topicActorId = await this.context.getActorId({
			active: topicActor.active,
			handle: topicActor.slug,
			name: topicActor.name,
			email: topicActor.email,
			title: topicActor.title
		})

		if (isTopicEvent(event)) {
			await processTopicData(
				sequence, topicMirrorId, event.data.payload.topic, {
					actor: topicActorId,
					baseUrl: this.baseUrl,
					options: this.options,
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

		if (isPostEvent(event)) {
			event.data.payload.post.current = true
		}

		const newThreadCard = await processTopicData(
			sequence,
			topicMirrorId,
			remoteTopicData, {
				actor: topicActorId,
				baseUrl: this.baseUrl,
				options: this.options,
				context: this.context,
				eventId
			})

		const posts = remoteTopicData.post_stream
			? await Bluebird.map(remoteTopicData.post_stream.posts, async (post) => {
				post.destroyed = Boolean(post.deleted_at)
				post.current = isPostEvent(event) && post.id === event.data.payload.post.id

				const postActor = await getActor(
					this.context, options.actor, this.options, baseUrl, {
						post
					})
				post.actorId = await this.context.getActorId({
					active: postActor.active,
					handle: postActor.slug,
					name: postActor.name,
					email: postActor.email,
					title: postActor.title
				})

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

			const postResponse = await httpDiscourse(
				this.context,
				this.options,
				'GET',
				`/posts/${event.data.payload.post.id}.json`, {
					baseUrl: this.baseUrl,
					actor: options.actor
				})

			assert.INTERNAL(null, postResponse.code !== 404,
				this.options.errors.SyncNoExternalResource,
				`The post ${event.data.payload.post.id} does not exist`)
			assert.INTERNAL(null, postResponse.code === 200,
				this.options.errors.SyncExternalRequestError, () => {
					return [
						`Could not get post ${event.data.payload.post.id}:`,
						JSON.stringify(postResponse, null, 2)
					].join(' ')
				})

			// Webhook events do not contain the raw post data, so we extract it from
			// the direct API query.
			// See https://meta.discourse.org/t/setting-up-webhooks/49045/55?u=lucianbuzzo
			event.data.payload.post.raw = postResponse.body.raw

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
				event.data.payload.post.destroyed = Boolean(postResponse.body.deleted_at)
			}

			event.data.payload.post.actorId = eventActorId

			if (!apiPost) {
				posts.push(event.data.payload.post)
			}

			// Only if necessary
			if (apiPost &&
				normalizeMessage(event.data.payload.post.raw, baseUrl) !==
				normalizeMessage(apiPost.raw, baseUrl)) {
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
				if (!post.current) {
					this.context.log.info('Back sync', postCard)
				}

				sequence.push(...utils.postEvent(sequence, postCard, newThreadCard, {
					actor: post.actorId
				}))

				continue
			}

			const patchedCard = _.cloneDeep(eventCard)
			patchedCard.active = postCard.active
			patchedCard.data.payload.message = postCard.data.payload.message

			if (!_.isEqual(eventCard, patchedCard)) {
				this.context.log.info('Back sync', patchedCard)
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
