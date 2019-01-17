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

const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const _ = require('lodash')
const Front = require('front-sdk').Front
const utils = require('../utils')
const errors = require('../errors')

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
 * @param {Object} payload - event payload
 * @returns {String} actor id
 */
const getMessageActor = async (context, front, payload) => {
	if (!payload) {
		return null
	}

	if (payload.author) {
		return context.getActorId('user', payload.author.username)
	}

	const from = _.find(payload.recipients, {
		role: 'from'
	})

	if (utils.isEmail(from.handle)) {
		return context.getActorId('account', from.handle)
	}

	// Sometimes even the contact link is null. In this case, we
	// have no information whatsoever from the contact, so we have
	// to default to making an e-mail up.
	// eslint-disable-next-line no-underscore-dangle
	if (!from._links.related.contact) {
		return context.getActorId('account', `${from.handle}@intercom.io`)
	}

	const contact = await front.contact.get({

		// eslint-disable-next-line no-underscore-dangle
		contact_id: _.last(_.split(from._links.related.contact, '/'))
	})

	if (utils.isEmail(contact.name)) {
		return context.getActorId('account', contact.name)
	}

	const name = contact.name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')

	return context.getActorId('account', `${name}@intercom.io`)
}

/**
 * @summary Get message from an event payload
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} front - front instance
 * @param {Array} sequence - current upsert sequence
 * @param {Object} payload - event payload
 * @param {String} threadId - thread id
 * @returns {Object} message card
 */
const getMessage = async (context, front, sequence, payload, threadId) => {
	const message = _.trim(payload.text || payload.body, ' \n')
	if (message.length <= 0 || payload.is_draft) {
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

	if (await context.getElementByMirrorId(type, mirrorId)) {
		return null
	}

	const actor = await getMessageActor(context, front, payload)
	if (!actor) {
		throw new errors.SyncNoActor(
			`Not actor id for message ${JSON.stringify(payload)}`)
	}

	const date = utils.getDateFromEpoch(payload.posted_at || payload.created_at)
	const data = {
		timestamp: date.toISOString(),
		actor,
		target: threadId,

		// eslint-disable-next-line no-underscore-dangle
		mirrors: [ mirrorId ],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message
		}
	}

	for (const element of sequence) {
		if (!element.card.data.mirrors) {
			continue
		}

		// Looks like we're already inserting this same event
		if (element.card.data.mirrors.includes(mirrorId) &&
				_.isEqual(data.payload, element.card.data.payload)) {
			return null
		}
	}

	return {
		slug: `${type}-${uuid()}`,
		type,
		tags: [],
		links: {},
		markers: [],
		active: true,
		data
	}
}

/**
 * @summary Get the inbox an event belongs to
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {Object} event - external event
 * @returns {String} inbox name
 */
const getEventInbox = async (front, event) => {
	// eslint-disable-next-line no-underscore-dangle
	if (event.data.payload.source._meta.type === 'inboxes') {
		return event.data.payload.source.data[0].name
	}

	const response = await front.conversation.listInboxes({
		conversation_id: event.data.payload.conversation.id
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
	}

	if (event.data.payload.type === 'archive' ||
		event.data.payload.conversation.status === 'archived') {
		delta.data = delta.data || {}
		delta.data.status = 'closed'
	}

	if (event.data.payload.type === 'restore' ||
		event.data.payload.type === 'reopen' ||
		event.data.payload.conversation.status === 'unassigned' ||
		event.data.payload.conversation.status === 'assigned') {
		delta.data = delta.data || {}
		delta.data.status = 'open'
	}

	if (event.data.payload.type === 'tag' ||
		event.data.payload.type === 'untag') {
		delta.tags = event.data.payload.conversation.tags.map((tag) => {
			return tag.name
		})
	}

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

	const inbox = await getEventInbox(front, event)
	return {
		name: event.data.payload.conversation.subject.replace(/^Re:\s/, ''),
		tags: [],
		links: {},
		markers: [],
		active: true,
		type: 'support-thread',
		slug: `support-thread-${event.data.payload.id.replace(/_/g, '-')}`,
		data: {
			translateDate:
				utils.getDateFromEpoch(event.data.payload.conversation.created_at).toISOString(),
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

/**
 * @summary Get all the whispers from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {String} conversationId - conversation id
 * @returns {Object[]} whispers
 */
const getThreadWhispers = async (front, conversationId) => {
	const comments = await front.conversation.listComments({
		conversation_id: conversationId,
		limit: 100
	})

	// eslint-disable-next-line no-underscore-dangle
	return comments._results
}

/**
 * @summary Get all the messages from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {String} conversationId - conversation id
 * @returns {Object[]} messages
 */
const getThreadMessages = async (front, conversationId) => {
	const comments = await front.conversation.listMessages({
		conversation_id: conversationId,
		limit: 100
	})

	// eslint-disable-next-line no-underscore-dangle
	return comments._results
}

/**
 * @summary Get all the whispers and comments from a Front thread
 * @function
 * @private
 *
 * @param {Object} front - front instance
 * @param {String} conversationId - conversation id
 * @returns {Object[]} all messages
 */
const getAllThreadMessages = async (front, conversationId) => {
	return _.flatten(await Bluebird.all([
		getThreadWhispers(front, conversationId),
		getThreadMessages(front, conversationId)
	]))
}

module.exports = class FrontIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
		this.front = new Front(this.options.token.api)
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
			return []
		}

		const cards = []

		const actor = await this.getLocalUser(event)
		if (!actor) {
			throw new errors.SyncNoActor(`Not actor id for ${JSON.stringify(event)}`)
		}

		const threadCard = await getThread(this.context, this.front, event)
		if (!threadCard.id) {
			cards.push({
				time: utils.getDateFromEpoch(event.data.payload.conversation.created_at),
				actor,
				card: _.cloneDeep(threadCard)
			})
			threadCard.id = {
				$eval: 'cards[0].id'
			}
		}

		// Do a recap using the API
		const remoteMessages = await getAllThreadMessages(
			this.front, _.last(threadCard.data.mirrors[0].split('/')))
		for (const remoteMessage of remoteMessages) {
			const comment = await getMessage(
				this.context, this.front, cards, remoteMessage, threadCard.id)
			cards.push(...utils.postEvent(cards, comment, threadCard, {
				actor: comment ? comment.data.actor : null
			}))
		}

		const date = utils.getDateFromEpoch(event.data.payload.emitted_at)
		const delta = getThreadDeltaFromEvent(event)
		const updatedThreadCard = utils.patchObject(threadCard, delta)

		if (updatedThreadCard.data.translateDate && date < new Date(updatedThreadCard.data.translateDate)) {
			return cards
		}

		if (_.isEqual(updatedThreadCard, threadCard)) {
			if (updatedThreadCard.data.translateDate && date > new Date(updatedThreadCard.data.translateDate)) {
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
		return cards.concat([
			{
				// We make a good enough approximation if we didn't know about the head
				// card, as Front won't tell us precisely when the event happened.
				time: _.isString(threadCard.id)
					? utils.getDateFromEpoch(event.data.payload.emitted_at)
					: utils.getDateFromEpoch(event.data.payload.conversation.created_at + 1),
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

		this.context.log.debug('Mirroring', {
			type: card.type
		})

		if (card.type === 'support-thread' && frontUrl) {
			const id = _.last(frontUrl.split('/'))
			const conversation = await this.front.conversation.get({
				conversation_id: id
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
				!_.isEqual(card.tags, _.map(conversation.tags, 'name'))) {
				let newStatus = conversation.status
				if (card.data.status === 'archived') {
					newStatus = 'deleted'
				}

				if (card.data.status === 'closed') {
					newStatus = 'archived'
				}

				this.context.log.debug('Updating front thread', {
					conversation: id,
					status: newStatus,
					tags: card.tags
				})

				const updateOptions = {
					conversation_id: id,
					tags: card.tags
				}

				if (newStatus === 'unassigned') {
					// Oddly enough Front doesn't like `status=unassigned`,
					// and expects this instead.
					updateOptions.assignee_id = null
				} else {
					updateOptions.status = newStatus
				}

				await this.front.conversation.update(updateOptions)

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
			const thread = await this.context.getElementById('support-thread', card.data.target)
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

			const response = await this.front.teammate.list()
			const actor = await this.context.getElementById('user', options.actor)
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

				this.context.log.debug('Creating front whisper', {
					conversation,
					author: author.id,
					body: message
				})

				const createResponse = await this.front.comment.create({
					conversation_id: conversation,
					author_id: author.id,
					body: message
				})

				// eslint-disable-next-line no-underscore-dangle
				card.data.mirrors.push(createResponse._links.self)
			}

			if (card.type === 'message') {
				const conversation = _.last(threadFrontUrl.split('/'))
				const message = card.data.payload.message

				this.context.log.debug('Creating front message', {
					conversation,
					author: author.id,
					body: message
				})

				const createResponse = await this.front.message.reply({
					conversation_id: conversation,
					author_id: author.id,
					body: card.data.payload.message,
					options: {
						archive: false
					}
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
			return this.context.getActorId('user', 'admin')
		}

		return getMessageActor(this.context, this.front, event.data.payload.target.data)
	}
}

// Front doesn't seem to offer any webhook security mechanism
module.exports.isEventValid = _.constant(true)
