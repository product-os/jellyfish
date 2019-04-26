/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const url = require('url')
const Front = require('front-sdk').Front
const Intercom = require('intercom-client')
const request = require('request-promise')
const utils = require('./utils')

/**
 * @summary Get the mirror id of a conversation
 * @function
 * @private
 *
 * @param {Object} event - external event
 * @returns {String} mirror id
 */
const getConversationMirrorId = (event) => {
	// eslint-disable-next-line no-underscore-dangle
	return event.data.payload.conversation._links.self
}

/**
 * @summary Get the actor id of a message
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} intercom - intercom instance
 * @param {Object} payload - event payload
 * @returns {String} actor id
 */
const getMessageActor = async (context, front, intercom, payload) => {
	if (!payload) {
		return null
	}

	/*
	 * Handle S/Community_Custom forums actor weirdness.
	 */
	if (payload.target &&
		payload.target.data &&
		payload.target.data.type === 'custom' &&
		payload.target.data.recipients.length > 1) {
		/*
		 * In forum messages the "from" is really "to" (?)
		 */
		const from = _.find(payload.target.data.recipients, {
			role: 'to'
		})

		/*
		 * If this is the case then we can patch the event accordingly.
		 */
		if (from) {
			payload.target.data.recipients = [ from ]
			payload.target.data.recipients[0].role = 'from'
		}
	}

	if (payload.author) {
		return context.getActorId('user', payload.author.username)
	}

	const from = _.find(payload.recipients, {
		role: 'from'
	})

	if (from && payload.type === 'intercom') {
		const email = await getIntercomEmail(intercom,
			from.handle)
		if (email) {
			return context.getActorId('account', email)
		}
	}

	if (utils.isEmail(from.handle)) {
		return context.getActorId('account', from.handle)
	}

	// Sometimes even the contact link is null. In this case, we
	// have no information whatsoever from the contact, so we have
	// to default to making an e-mail up.
	// eslint-disable-next-line no-underscore-dangle
	if (!from._links.related.contact) {
		return context.getActorId('account', from.handle)
	}

	let contact = await handleRateLimit(context, () => {
		return front.contact.get({

			// eslint-disable-next-line no-underscore-dangle
			contact_id: _.last(_.split(from._links.related.contact, '/'))
		})
	})

	if (contact.name === 'S/Community_Custom') {
		const to = _.find(payload.recipients, {
			role: 'to'
		})

		contact = await handleRateLimit(context, () => {
			return front.contact.get({

				// eslint-disable-next-line no-underscore-dangle
				contact_id: _.last(_.split(to._links.related.contact, '/'))
			})
		})
	}

	if (utils.isEmail(contact.name)) {
		return context.getActorId('account', contact.name)
	}

	const name = contact.name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')

	return context.getActorId('account', name)
}

const getMessageText = (payload) => {
	/*
	 * This means that the body is plain text and not HTML.
	 */
	if (payload.body && _.isNil(payload.text)) {
		return _.trim(payload.body, ' \n')
	}

	if (payload.attachments &&
		payload.attachments.length > 0 &&
		payload.text.trim().length === 0) {
		return ''
	}

	/*
	 * We always look at the HTML alternative because if we post a message
	 * two new lines (i.e. "Hello\n\nWorld"), then Front will internally
	 * convert it to HTML as "Hello<br>\nWorld", and then attempt to derive
	 * the text representation from it, which will end up being "Hello\nWorld"
	 * as "\n" is meaningless on an HTML string.
	 * The final result is that we lose double new lines.
	 *
	 * See https://github.com/balena-io/jellyfish/issues/1601
	 */
	if (payload.body) {
		return utils.parseHTML(payload.body)
	}

	return _.trim(payload.text, ' \n')
}

/**
 * @summary Get message from an event payload
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} intercom - intercom instance
 * @param {Array} sequence - current upsert sequence
 * @param {Object} payload - event payload
 * @param {String} threadId - thread id
 * @param {Date} emittedDate - emitter date
 * @returns {Object} message card
 */
const getMessage = async (context, front, intercom, sequence, payload, threadId, emittedDate) => {
	const message = getMessageText(payload)

	const attachments = (payload.attachments || []).map((attachment) => {
		return {
			url: attachment.url,
			name: attachment.filename,
			mime: attachment.content_type,
			bytesize: attachment.size
		}
	})

	if ((message.length <= 0 && attachments.length === 0) || payload.is_draft) {
		return null
	}

	// For some reason, in Front <-> Discourse integration we get
	// pointless whispers that look like this:
	//
	//   Username: jviotti
	//   Email: juan@resin.io
	//   Signed up: 4 years ago
	//   Written: 147 posts
	//   Read: 509 posts
	//
	// I haven't found a better way to match these.
	if (_.isEqual(_.chain(message)
		.split('\n')
		.initial()
		.map((line) => {
			return _.first(line.split(':'))
		})
		.value(), [ 'Username', 'Email', 'Signed up', 'Written', 'Read' ])) {
		return null
	}

	// eslint-disable-next-line no-underscore-dangle
	const mirrorId = payload._links.self
	const type = mirrorId.startsWith('https://api2.frontapp.com/comments/')
		? 'whisper' : 'message'

	const date = utils.getDateFromEpoch(payload.posted_at || payload.created_at)

	const object = {
		/*
		 * Encoding the mirror id in the slug ensures that we don't
		 * try to insert the same event twice when failing to determine
		 * that there is already an element with the same mirror id
		 * on the database.
		 */
		slug: `${type}-front-${_.last(mirrorId.split('/')).replace(/_/g, '-')}`,

		type,
		tags: [],
		links: {},
		markers: [],
		active: true,
		data: {
			timestamp: date.toISOString(),
			target: threadId,
			translateDate: emittedDate.toISOString(),

			// eslint-disable-next-line no-underscore-dangle
			mirrors: [ mirrorId ],
			payload: {
				mentionsUser: [],
				alertsUser: [],
				message
			}
		}
	}

	if (attachments.length > 0) {
		object.data.payload.attachments = attachments
	}

	const currentMessage =
		await context.getElementByMirrorId(type, mirrorId)
	if (currentMessage) {
		// Edited comments
		if (emittedDate > new Date(currentMessage.data.translateDate || currentMessage.data.timestamp) &&
			currentMessage.data.payload.message !== object.data.payload.message) {
			object.slug = currentMessage.slug
			object.data.translateDate = emittedDate.toISOString()
		} else {
			return null
		}
	}

	const actor = await getMessageActor(context, front, intercom, payload)
	if (!actor) {
		throw new this.options.errors.SyncNoActor(
			`Not actor id for message ${JSON.stringify(payload)}`)
	}

	object.data.actor = actor

	for (const element of sequence) {
		if (!element.card.data.mirrors) {
			continue
		}

		// Looks like we're already inserting this same event
		if (element.card.data.mirrors.includes(mirrorId) &&
				_.isEqual(object.data.payload, element.card.data.payload)) {
			return null
		}
	}

	return object
}

/**
 * @summary Get the last message from a conversation
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} intercom - intercom instance
 * @param {Array} sequence - current upsert sequence
 * @param {Object} event - external event
 * @param {Object} targetCard - partial target card
 * @returns {Array} new sequence upserts
 */
const getConversationLastMessage = async (
	context, front, intercom, sequence, event, targetCard) => {
	if (!event.data.payload.conversation ||
			!event.data.payload.conversation.last_message) {
		return []
	}

	const root = event.data.payload.conversation.last_message
	const message = await getMessage(
		context, front, sequence, root, targetCard.id,
		utils.getDateFromEpoch(event.data.payload.emitted_at))
	return utils.postEvent(sequence, message, targetCard, {
		actor: message ? message.data.actor : null
	})
}

/**
 * @summary Get the message from an event
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} intercom - intercom instance
 * @param {Array} sequence - current upsert sequence
 * @param {Object} event - external event
 * @param {Object} targetCard - partial target card
 * @returns {Array} new sequence upserts
 */
const getEventMessage = async (context, front, intercom, sequence, event, targetCard) => {
	if (!event.data.payload.target) {
		return []
	}

	const root = event.data.payload.target.data
	const message = await getMessage(
		context, front, intercom, sequence, root, targetCard.id,
		utils.getDateFromEpoch(event.data.payload.emitted_at))
	return utils.postEvent(sequence, message, targetCard, {
		actor: message ? message.data.actor : null
	})
}

/**
 * @summary Get the inbox an event belongs to
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} event - external event
 * @returns {String} inbox name
 */
const getEventInbox = async (context, front, event) => {
	// eslint-disable-next-line no-underscore-dangle
	if (event.data.payload.source._meta.type === 'inboxes') {
		return event.data.payload.source.data[0].name
	}

	const response = await handleRateLimit(context, () => {
		return front.conversation.listInboxes({
			conversation_id: event.data.payload.conversation.id
		})
	})

	// eslint-disable-next-line no-underscore-dangle
	return response._results[0].name
}

/**
 * @summary Get a delta to apply to the thread card
 * @function
 * @private
 *
 * @param {Object} event - external event
 * @returns {Object} delta
 */
const getThreadDeltaFromEvent = (event) => {
	const delta = {}

	if (event.data.payload.type === 'trash') {
		delta.data = delta.data || {}
		delta.data.status = 'archived'
	} else if (event.data.payload.type === 'archive' ||
		event.data.payload.conversation.status === 'archived') {
		delta.data = delta.data || {}
		delta.data.status = 'closed'
	} else if (event.data.payload.type === 'restore' ||
		event.data.payload.type === 'reopen' ||
		event.data.payload.conversation.status === 'unassigned' ||
		event.data.payload.conversation.status === 'assigned') {
		delta.data = delta.data || {}
		delta.data.status = 'open'
	}

	delta.tags = event.data.payload.conversation.tags.map((tag) => {
		return tag.name
	})

	return delta
}

/**
 * @summary Get thread from an event payload
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Object} event - event payload
 * @returns {Object} thread card
 */
const getThread = async (context, front, event) => {
	const mirrorId = getConversationMirrorId(event)
	const threadCard =
		await context.getElementByMirrorId('support-thread', mirrorId)
	if (threadCard) {
		return threadCard
	}

	const inbox = await getEventInbox(context, front, event)
	return {
		name: event.data.payload.conversation.subject.replace(/^Re:\s/, ''),
		tags: [],
		links: {},
		markers: [],
		active: true,
		type: 'support-thread',
		slug: `support-thread-front-${_.last(mirrorId.split('/')).replace(/_/g, '-')}`,
		data: {
			translateDate: utils.getDateFromEpoch(
				event.data.payload.conversation.created_at).toISOString(),
			environment: 'production',
			inbox,
			mirrors: [ mirrorId ],
			mentionsUser: [],
			alertsUser: [],
			description: '',
			status: 'open'
		}
	}
}

const handleRateLimit = async (context, fn, times = 30) => {
	try {
		return fn()
	} catch (error) {
		if (error.name === 'FrontError' && error.status === 429 && times > 0) {
			context.log.warn('Front rate limiting exceeded', {
				message: error.message
			})

			await Bluebird.delay(2000)
			return handleRateLimit(context, fn, times - 1)
		}

		throw error
	}
}

/**
 * @summary Paginate over a Front SDK collection
 * @function
 * @private
 *
 * @param {Object} context - context
 * @param {Function} fn - Front SDK function
 * @param {Object} args - arguments to the function
 * @param {String} [pageToken] - page token
 * @returns {Object[]} results
 */
const frontPaginate = async (context, fn, args, pageToken) => {
	const limit = 100
	const response = await handleRateLimit(context, () => {
		const options = {
			limit
		}

		if (pageToken) {
			options.page_token = pageToken
		}

		return fn(Object.assign({}, args, options))
	})

	// eslint-disable-next-line no-underscore-dangle
	const results = response._results

	// eslint-disable-next-line no-underscore-dangle
	if (!response._pagination.next) {
		return results
	}

	// eslint-disable-next-line no-underscore-dangle
	const nextPageToken = url.parse(response._pagination.next, true)
		.query.page_token
	const next = await frontPaginate(context, fn, args, nextPageToken)
	return results.concat(next)
}

/**
 * @summary Get all the whispers from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {Object} context - execution context
 * @param {String} conversationId - conversation id
 * @returns {Object[]} whispers
 */
const getThreadWhispers = async (front, context, conversationId) => {
	return frontPaginate(context, front.conversation.listComments, {
		conversation_id: conversationId
	})
}

/**
 * @summary Get all the messages from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {Object} context - execution context
 * @param {String} conversationId - conversation id
 * @returns {Object[]} messages
 */
const getThreadMessages = async (front, context, conversationId) => {
	return frontPaginate(context, front.conversation.listMessages, {
		conversation_id: conversationId
	})
}

/**
 * @summary Get the email out of an intercom user id
 * @function
 * @private
 *
 * @param {Object} intercom - intercom instance
 * @param {String} id - intercom user id
 * @returns {String} email
 */
const getIntercomEmail = async (intercom, id) => {
	return new Bluebird((resolve, reject) => {
		intercom.users.find({
			id
		}, (error, user) => {
			if (error) {
				if (error.statusCode === 404) {
					return resolve(null)
				}

				return reject(error)
			}

			return resolve(user.body.email)
		})
	})
}

const getConversationChannel = async (context, errors, front, conversationId, inboxId) => {
	/*
	 * (1) Fetch the conversation from the Front API so we can inspect
	 * its last message and determine the last address involved, as
	 * that's the one we should reply as.
	 */
	const conversationResponse = await handleRateLimit(context, () => {
		return front.conversation.get({
			conversation_id: conversationId
		})
	})

	/*
	 * (2) Fetch all the inboxes associated with the conversation
	 * we want to post in.
	 */
	const inboxesResponse = await handleRateLimit(context, () => {
		return front.conversation.listInboxes({
			conversation_id: conversationResponse.id
		})
	})

	/*
	 * (3) Find the actual inbox we're interested in, assuming
	 * there are more than one.
	 */
	// eslint-disable-next-line no-underscore-dangle
	const inbox = _.find(inboxesResponse._results, (result) => {
		return result.name === inboxId || result.id === inboxId
	})
	if (!inbox) {
		throw new errors.SyncNoExternalResource(
			`Could not find inbox ${inboxId} in conversation ${conversationId}`)
	}

	/*
	 * (4) Now that we have the inbox, we can actually list all
	 * the channels associated with it.
	 */
	const channelsResponse = await handleRateLimit(context, () => {
		return front.inbox.listChannels({
			inbox_id: inbox.id
		})
	})

	/*
	 * (5) Lets use the addresses involved in the conversation's
	 * last message as a heuristic to pick the right channels from
	 * that inbox.
	 */
	const lastMessageAddresses = _.map(
		conversationResponse.last_message.recipients, 'handle')
	// eslint-disable-next-line no-underscore-dangle
	const channel = _.find(channelsResponse._results, (result) => {
		return lastMessageAddresses.includes(result.address) ||
			lastMessageAddresses.includes(result.name) ||
			lastMessageAddresses.includes(result.send_as)
	})
	if (!channel) {
		throw new errors.SyncNoExternalResource(
			`Could not find channel to respond to ${conversationId}`)
	}

	context.log.info('Front channel found', {
		channel: _.omit(channel, [ '_links' ]),
		inbox: _.omit(inbox, [ '_links' ]),
		addresses: lastMessageAddresses,
		conversation: conversationId
	})

	return channel
}

/**
 * @summary Get all the whispers and comments from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {Object} context - execution context
 * @param {String} conversationId - conversation id
 * @returns {Object[]} all messages
 */
const getAllThreadMessages = async (front, context, conversationId) => {
	return _.flatten(await Bluebird.all([
		getThreadWhispers(front, context, conversationId),
		getThreadMessages(front, context, conversationId)
	]))
}

module.exports = class FrontIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
		this.front = new Front(this.options.token.api)
		this.intercom = new Intercom.Client({
			token: this.options.token.intercom
		})
	}

	// eslint-disable-next-line class-methods-use-this
	async initialize () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	async translate (event) {
		// In Front, these events can happen even before the conversation actually
		// starts, so if we process the events before the actual conversation,
		// then we will correctly detect and sync an empty conversation, which
		// makes little practical sense.
		if (event.data.payload.conversation.status === 'invisible') {
			this.context.log.info('Ignoring invisible conversation')
			return []
		}

		const cards = []

		const actor = await this.getLocalUser(event)
		if (!actor) {
			throw new this.options.errors.SyncNoActor(
				`No actor id for ${JSON.stringify(event)}`)
		}

		const threadActor = await this.getThreadActor(event)
		if (!threadActor) {
			throw new this.options.errors.SyncNoActor(
				`No thread actor id for ${JSON.stringify(event)}`)
		}

		const threadCard = await getThread(this.context, this.front, event)
		if (!threadCard.id) {
			this.context.log.info('Creating thread', {
				slug: threadCard.slug
			})

			cards.push({
				time: utils.getDateFromEpoch(
					event.data.payload.conversation.created_at),
				actor: threadActor,
				card: _.cloneDeep(threadCard)
			})
			threadCard.id = {
				$eval: 'cards[0].id'
			}
		}

		// Do a recap using the API
		const remoteMessages = await getAllThreadMessages(
			this.front, this.context, _.last(threadCard.data.mirrors[0].split('/')))

		this.context.log.info('Inserting remote messages', {
			count: remoteMessages.length
		})

		for (const remoteMessage of remoteMessages) {
			const comment = await getMessage(
				this.context, this.front, this.intercom, cards, remoteMessage,
				threadCard.id, utils.getDateFromEpoch(event.data.payload.emitted_at))
			cards.push(...utils.postEvent(cards, comment, threadCard, {
				actor: comment ? comment.data.actor : null
			}))
		}

		// We still extract any message mentioned in the event itself,
		// just in case the API is not updated by the time we query
		const eventMessage = await getEventMessage(
			this.context, this.front, this.intercom, cards, event, threadCard)
		if (eventMessage.length > 0) {
			this.context.log.info('Inserting event message')
		}
		cards.push(...eventMessage)

		const lastMessage = await getConversationLastMessage(
			this.context, this.front, this.intercom, cards, event, threadCard)
		if (lastMessage.length > 0) {
			this.context.log.info('Inserting last message')
		}
		cards.push(...lastMessage)

		const date = utils.getDateFromEpoch(event.data.payload.emitted_at)
		const delta = getThreadDeltaFromEvent(event)
		const updatedThreadCard = utils.patchObject(threadCard, delta)

		if (updatedThreadCard.data.translateDate &&
				date < new Date(updatedThreadCard.data.translateDate)) {
			this.context.log.info('Translate date is a future date')
			return cards
		}

		if (_.isEqual(updatedThreadCard, threadCard)) {
			this.context.log.info('Thread card remains the same', {
				slug: threadCard.slug
			})

			if (updatedThreadCard.data.translateDate &&
					date > new Date(updatedThreadCard.data.translateDate)) {
				if (!_.isEmpty(cards)) {
					const index = _.findLastIndex(cards, {
						card: {
							type: 'support-thread'
						}
					})

					if (index > -1) {
						cards[index].card.data.translateDate = date.toISOString()
						return cards
					}
				}

				updatedThreadCard.data.translateDate = date.toISOString()
				return cards.concat([
					{
						time: date,
						actor,
						card: updatedThreadCard
					}
				])
			}

			return cards
		}

		updatedThreadCard.data.translateDate = date.toISOString()

		// We make a good enough approximation if we didn't know about the head
		// card, as Front won't tell us precisely when the event happened.
		const creationDate = utils.getDateFromEpoch(
			event.data.payload.conversation.created_at + 1)

		return cards.concat([
			{
				time: _.isString(threadCard.id) ? date : creationDate,
				actor,
				card: updatedThreadCard
			}
		])
	}

	// eslint-disable-next-line class-methods-use-this
	async mirror (card, options) {
		const frontUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, 'https://api2.frontapp.com')
		})

		this.context.log.info('Mirroring', {
			url: frontUrl,
			remote: card
		})

		if (card.type === 'support-thread' && frontUrl) {
			const id = _.last(frontUrl.split('/'))
			const conversation = await handleRateLimit(this.context, () => {
				return this.front.conversation.get({
					conversation_id: id
				})
			})

			let status = 'open'
			if (conversation.status === 'deleted') {
				status = 'archived'
			}

			if (conversation.status === 'archived') {
				status = 'closed'
			}

			if (conversation.subject.replace(/^Re:\s/, '') !== card.name ||
				status !== card.data.status ||
				!_.isEqual(_.sortBy(card.tags), _.sortBy(_.map(conversation.tags, 'name')))) {
				let newStatus = conversation.status
				if (card.data.status === 'archived') {
					newStatus = 'deleted'
				}

				if (card.data.status === 'closed') {
					newStatus = 'archived'
				}

				this.context.log.info('Updating front thread', {
					conversation: id,
					status: newStatus,
					tags: card.tags
				})

				const updateOptions = {
					conversation_id: id,
					tags: card.tags
				}

				// Oddly enough Front doesn't like `status=unassigned`,
				// or `status=assigned` and expects this instead.
				if (newStatus === 'unassigned') {
					updateOptions.assignee_id = null
				} else if (newStatus === 'assigned') {
					updateOptions.assignee_id = conversation.assignee.id
				} else {
					updateOptions.status = newStatus
				}

				this.context.log.info('Updating front conversation', updateOptions)
				await handleRateLimit(this.context, () => {
					return this.front.conversation.update(updateOptions)
				})

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

		// Only external people may create conversations from Front
		if (card.type === 'support-thread' && !frontUrl) {
			return []
		}

		if (card.type === 'message' || card.type === 'whisper') {
			const thread = await this.context.getElementById(
				'support-thread', card.data.target)
			if (!thread || thread.type !== 'support-thread') {
				return []
			}

			// We have no way to update Front comments or messages
			if (frontUrl) {
				return []
			}

			const threadFrontUrl = _.find(thread.data.mirrors, (mirror) => {
				return _.startsWith(mirror, 'https://api2.frontapp.com')
			})
			if (!threadFrontUrl) {
				return []
			}

			const response = await handleRateLimit(this.context, () => {
				return this.front.teammate.list()
			})

			const actor = await this.context.getElementById(
				'user', options.actor)
			if (!actor) {
				return []
			}

			// eslint-disable-next-line no-underscore-dangle
			const author = _.find(response._results, {
				// Front automatically transforms hyphens to
				// underscores in the UI
				username: actor.slug
					.replace(/^user-/g, '')
					.replace(/-/g, '_')
			})

			if (!author) {
				return []
			}

			card.data.mirrors = card.data.mirrors || []

			if (card.type === 'whisper') {
				const conversation = _.last(threadFrontUrl.split('/'))
				const message = card.data.payload.message

				this.context.log.info('Creating front whisper', {
					conversation,
					author: author.id,
					body: message
				})

				const createResponse = await handleRateLimit(this.context, () => {
					return this.front.comment.create({
						conversation_id: conversation,
						author_id: author.id,
						body: message
					})
				})

				// eslint-disable-next-line no-underscore-dangle
				card.data.mirrors.push(createResponse._links.self)
			}

			if (card.type === 'message') {
				const conversation = _.last(threadFrontUrl.split('/'))
				const message = card.data.payload.message

				this.context.log.info('Creating front message', {
					conversation,
					author: author.id,
					body: message
				})

				const channel = await getConversationChannel(
					this.context, this.options.errors,
					this.front, conversation, thread.data.inbox)
				const createResponse = await handleRateLimit(this.context, () => {
					return this.front.message.reply({
						conversation_id: conversation,
						author_id: author.id,
						body: message,
						channel_id: channel.id,

						/*
						 * Front seems to mess up back ticks by replacing them
						 * with "<br>\n", but for some reason it doesn't mangle
						 * the data if we also pass a plain text version of the
						 * message (?)
						 */
						text: message,

						options: {
							archive: false
						}
					})
				})

				// eslint-disable-next-line no-underscore-dangle
				card.data.mirrors.push(createResponse._links.self)
			}

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

	async getLocalUser (event) {
		// eslint-disable-next-line no-underscore-dangle
		if (event.data.payload.source._meta.type === 'teammate') {
			// An action done by a rule
			if (!event.data.payload.source.data) {
				return this.context.getActorId('user', 'admin')
			}

			return this.context.getActorId(
				'user', event.data.payload.source.data.username)
		}

		// This seems to be true when there is an event caused
		// by a rule, and not by anyone in particular.
		// eslint-disable-next-line no-underscore-dangle
		if (event.data.payload.source._meta.type === 'api' ||
				// eslint-disable-next-line no-underscore-dangle
				event.data.payload.source._meta.type === 'reminder') {
			if (!event.data.payload.target ||
				!event.data.payload.target.data ||
				(event.data.payload.target &&
					!event.data.payload.target.data.author &&
					!event.data.payload.target.data.recipients)) {
				return this.context.getActorId('user', 'admin')
			}
		}

		return getMessageActor(
			this.context,
			this.front,
			this.intercom,
			event.data.payload.target.data)
	}

	async getThreadActor (event) {
		if (event.data.payload.conversation && event.data.payload.conversation.recipient) {
			// eslint-disable-next-line no-underscore-dangle
			if (event.data.payload.conversation.recipient._links &&
				// eslint-disable-next-line no-underscore-dangle
				event.data.payload.conversation.recipient._links.related) {
				// eslint-disable-next-line no-underscore-dangle
				const contactUrl = event.data.payload.conversation.recipient._links.related.contact

				if (contactUrl) {
					const contact = await handleRateLimit(this.context, () => {
						return this.front.contact.get({
							contact_id: _.last(_.split(contactUrl, '/'))
						})
					})

					if (contact && contact.name) {
						return this.context.getActorId('account', contact.name)
					}
				}

				if (event.data.payload.conversation.recipient.handle &&
					event.data.payload.conversation.last_message.type !== 'intercom') {
					return this.context.getActorId(
						'account', event.data.payload.conversation.recipient.handle)
				}
			}

			// eslint-disable-next-line no-underscore-dangle
			if (event.data.payload.conversation.recipient.role === 'from' &&
				event.data.payload.conversation.recipient.handle &&
				// eslint-disable-next-line no-underscore-dangle
				!event.data.payload.conversation.recipient._links.related.contact &&
				!event.data.payload.conversation.recipient.handle.includes('@')) {
				const email = await getIntercomEmail(this.intercom,
					event.data.payload.conversation.recipient.handle)
				if (email) {
					return this.context.getActorId('account', email)
				}
			}
		}

		if (event.data.payload.target &&
			// eslint-disable-next-line no-underscore-dangle
			event.data.payload.target._meta &&
			// eslint-disable-next-line no-underscore-dangle
			event.data.payload.target._meta.type === 'message' &&
			event.data.payload.target.data &&
			!event.data.payload.target.data.is_inbound) {
			const target = _.find(event.data.payload.target.data.recipients, {
				role: 'to'
			})

			if (target) {
				const contact = await handleRateLimit(this.context, () => {
					return this.front.contact.get({
						// eslint-disable-next-line no-underscore-dangle
						contact_id: _.last(_.split(target._links.related.contact, '/'))
					})
				})

				if (contact && contact.name) {
					return this.context.getActorId('account', contact.name)
				}
			}
		}

		// Fallback to the event actor
		return this.getLocalUser(event)
	}

	/**
	 * TODO Move this method to the front SDK
	 * Fetches a file from the front API and returns it as a buffer
	 *
	 * @param {String} file - The slug of the file to download
	 *
	 * @returns {Buffer}
	 */
	async getFile (file) {
		const requestOpts = {
			headers: {
				Authorization: `Bearer ${this.options.token.api}`
			},
			url: `https://api2.frontapp.com/download/${file}`,

			// Setting encoding to null is very important for downloading the full
			// file as it makes the 'request' package expect binary data; without it
			// the file ends up corrupted
			encoding: null
		}

		const response = await request(requestOpts)
		const buffer = Buffer.from(response, 'utf8')
		return buffer
	}
}

// Front doesn't seem to offer any webhook security mechanism
module.exports.isEventValid = _.constant(true)
