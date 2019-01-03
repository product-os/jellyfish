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

const getConversationMirrorId = (event) => {
	// eslint-disable-next-line no-underscore-dangle
	return event.data.payload.conversation._links.self
}

const getEpochDate = (epoch) => {
	return new Date(epoch * 1000)
}

const updateCardFromSequence = (sequence, index, changes) => {
	const card = _.cloneDeep(sequence[index].card)
	_.merge(card, changes)
	card.id = {
		$eval: `cards[${index}].id`
	}

	return card
}

const getMessage = (context, payload, options) => {
	const message = _.trim(payload.text || payload.body, ' \n')
	if (message.length <= 0) {
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

	const date = getEpochDate(payload.posted_at || payload.created_at)
	const data = {
		timestamp: date.toISOString(),
		actor: options.actor,
		target: options.target,

		// eslint-disable-next-line no-underscore-dangle
		mirrors: [ payload._links.self ],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message
		}
	}

	return {
		time: date,
		card: {
			slug: `${options.type}-${uuid()}`,
			type: options.type,
			data
		}
	}
}

const getMessageFromEvent = (context, event, options) => {
	const root = event.data.payload.target && event.data.payload.target.data &&
		(event.data.payload.target.data.text || event.data.payload.target.data.body)
		? event.data.payload.target.data
		: event.data.payload.conversation.last_message

	if (!options.type) {
		// eslint-disable-next-line no-underscore-dangle
		options.type = root._links.self.startsWith('https://api2.frontapp.com/comments/')
			? 'whisper' : 'message'
	}

	const message = getMessage(context, root, options)
	if (message) {
		context.log.debug('Inserting message', {
			data: message.data
		})

		return [
			message,
			{
				time: message.time,
				card: {
					slug: `link-${message.card.slug}-is-attached-to-${options.targetSlug}`,
					type: 'link',
					name: 'is attached to',
					data: {
						inverseName: 'has attached element',
						from: {
							id: {
								$eval: `cards[${options.offset}].id`
							},
							type: message.card.type
						},
						to: {
							id: message.card.data.target,
							type: 'support-thread'
						}
					}
				}
			}
		]
	}

	return []
}

const getDelta = (event) => {
	if (event.data.payload.type === 'trash') {
		return {
			data: {
				status: 'archived'
			}
		}
	}

	if (event.data.payload.type === 'archive') {
		return {
			data: {
				status: 'closed'
			}
		}
	}

	if (event.data.payload.type === 'restore' || event.data.payload.type === 'reopen') {
		return {
			data: {
				status: 'open'
			}
		}
	}

	if (event.data.payload.type === 'tag' || event.data.payload.type === 'untag') {
		return {
			tags: event.data.payload.conversation.tags.map((tag) => {
				return tag.name
			})
		}
	}

	return null
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

	// eslint-disable-next-line class-methods-use-this
	async mirror (card) {
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

				await this.front.conversation.update({
					conversation_id: id,
					status: newStatus,
					tags: card.tags
				})

				return [
					{
						time: new Date(),
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
			const actor = await this.context.getElementById('user', this.options.actor)
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
					card
				}
			]
		}

		return []
	}

	async translate (event) {
		this.context.log.debug('Translating', {
			type: event.data.payload.type
		})

		if ([ 'inbound', 'outbound', 'out_reply' ].includes(event.data.payload.type)) {
			const thread = await this.getSupportThreadByMirrorId(getConversationMirrorId(event))
			if (!thread) {
				return this.recreateThreadFromEvent(event)
			}

			// eslint-disable-next-line no-underscore-dangle
			if (await this.getCommentByMirrorId(event.data.payload.target.data._links.self)) {
				return []
			}

			return getMessageFromEvent(this.context, event, {
				actor: this.options.actor,
				type: 'message',
				target: thread.id,
				targetSlug: thread.slug,
				offset: 0
			})
		}

		if (event.data.payload.type === 'assign' && event.data.payload.conversation.subject.length > 0) {
			const thread = await this.getSupportThreadByMirrorId(getConversationMirrorId(event))
			if (!thread) {
				return this.recreateThreadFromEvent(event)
			}
		}

		if (event.data.payload.type === 'comment') {
			const thread = await this.getSupportThreadByMirrorId(getConversationMirrorId(event))

			if (thread) {
				const whisper = getMessageFromEvent(this.context, event, {
					actor: this.options.actor,
					type: 'whisper',
					target: thread.id,
					targetSlug: thread.slug,
					offset: 0
				})

				if (whisper.length > 0 && await this.getWhisperByMirrorId(whisper[0].card.data.mirrors[0])) {
					return []
				}

				return whisper
			}

			const cards = await this.recreateThreadFromEvent(event)
			const target = {
				$eval: 'cards[0].id'
			}

			const offsetWhisper = getMessageFromEvent(this.context, event, {
				actor: this.options.actor,
				type: 'whisper',
				target,
				targetSlug: thread ? thread.slug : cards[0].card.slug,
				offset: cards.length
			})

			if (offsetWhisper.length === 0) {
				return cards
			}

			for (const card of cards) {
				if (card.card.data.mirrors &&
						card.card.data.mirrors.includes(offsetWhisper[0].card.data.mirrors[0])) {
					return cards
				}
			}

			return cards.concat(offsetWhisper)
		}

		const delta = getDelta(event)
		if (!delta) {
			return []
		}

		const thread = await this.getSupportThreadByMirrorId(getConversationMirrorId(event))
		if (!thread) {
			const cards = await this.recreateThreadFromEvent(event)
			cards.push({
				time: getEpochDate(event.data.payload.emitted_at),
				card: updateCardFromSequence(cards, 0, delta)
			})

			return cards
		}

		_.mergeWith(thread, delta, (objectValue, sourceValue) => {
			// Always do array overrides
			if (_.isArray(sourceValue)) {
				return sourceValue
			}

			// _.mergeWith expected undefined
			// eslint-disable-next-line no-undefined
			return undefined
		})

		return [
			{
				time: getEpochDate(event.data.payload.emitted_at),
				card: thread
			}
		]
	}

	async getSupportThreadByMirrorId (id) {
		return this.context.getElementByMirrorId('support-thread', id)
	}

	async getCommentByMirrorId (id) {
		return this.context.getElementByMirrorId('message', id)
	}

	async getWhisperByMirrorId (id) {
		return this.context.getElementByMirrorId('whisper', id)
	}

	async getInbox (event) {
		// eslint-disable-next-line no-underscore-dangle
		if (event.data.payload.source._meta.type === 'inboxes') {
			return event.data.payload.source.data[0].name
		}

		const response = await this.front.conversation.listInboxes({
			conversation_id: event.data.payload.conversation.id
		})

		// eslint-disable-next-line no-underscore-dangle
		return response._results[0].name
	}

	async recreateThreadFromEvent (event) {
		const data = {
			environment: 'production',
			inbox: await this.getInbox(event),
			mirrors: [ getConversationMirrorId(event) ],
			mentionsUser: [],
			alertsUser: [],
			description: '',
			status: 'open'
		}

		const cards = [
			{
				time: getEpochDate(event.data.payload.conversation.created_at),
				card: {
					name: event.data.payload.conversation.subject.replace(/^Re:\s/, ''),
					type: 'support-thread',
					slug: `support-thread-${event.data.payload.id.replace(/_/g, '-')}`,
					data
				}
			}
		]

		this.context.log.debug('Inserting thread', {
			data
		})

		const message1 = getMessageFromEvent(this.context, event, {
			actor: this.options.actor,
			offset: 0,
			targetSlug: cards[0].card.slug,
			target: {
				$eval: 'cards[0].id'
			}
		})

		Reflect.deleteProperty(event.data.payload, 'target')

		const message2 = getMessageFromEvent(this.context, event, {
			actor: this.options.actor,
			offset: message1.length,
			targetSlug: cards[0].card.slug,
			target: {
				$eval: 'cards[0].id'
			}
		})

		if (message1.length > 0) {
			cards.push(...message1)
		}

		if (message2.length > 0) {
			for (const card of cards) {
				if (card.card.data.mirrors &&
						card.card.data.mirrors.includes(message2[0].card.data.mirrors[0])) {
					return cards
				}
			}

			cards.push(...message2)
		}

		return cards
	}
}

module.exports.getLocalUser = async (event, options) => {
	// eslint-disable-next-line no-underscore-dangle
	if (event.data.payload.source._meta.type === 'teammate') {
		return {
			type: 'user',
			username: event.data.payload.source.data.username
		}
	}

	if (event.data.payload.target.data.author) {
		return {
			type: 'user',
			username: event.data.payload.target.data.author.username
		}
	}

	// This seems to be true when there is an event caused
	// by a rule, and not by anyone in particular.
	// eslint-disable-next-line no-underscore-dangle
	if (event.data.payload.source._meta.type === 'api') {
		return {
			type: 'user',
			username: 'admin'
		}
	}

	const from = _.find(event.data.payload.target.data.recipients, {
		role: 'from'
	})

	const front = new Front(options.token.api)

	if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(from.handle)) {
		return {
			type: 'account',
			email: from.handle
		}
	}

	// Sometimes even the contact link is null. In this case, we
	// have no information whatsoever from the contact, so we have
	// to default to making an e-mail up.
	// eslint-disable-next-line no-underscore-dangle
	if (!from._links.related.contact) {
		return {
			type: 'account',
			email: `${from.handle}@intercom.io`
		}
	}

	const contact = await front.contact.get({

		// eslint-disable-next-line no-underscore-dangle
		contact_id: _.last(_.split(from._links.related.contact, '/'))
	})

	return {
		type: 'account',
		email: contact.name
	}
}

// Front doesn't seem to offer any webhook security mechanism
module.exports.isEventValid = _.constant(true)
