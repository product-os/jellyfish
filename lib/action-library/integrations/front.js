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

const getMessage = (payload, options) => {
	const message = _.trim(payload.text || payload.body, ' \n')
	if (message.length <= 0) {
		return null
	}

	const date = getEpochDate(payload.posted_at || payload.created_at)
	return {
		time: date,
		card: {
			type: options.type,
			active: true,
			tags: [],
			links: {},
			data: {
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
		}
	}
}

const getMessageFromEvent = (event, options) => {
	const root = event.data.payload.target && event.data.payload.target.data &&
		(event.data.payload.target.data.text || event.data.payload.target.data.body)
		? event.data.payload.target.data
		: event.data.payload.conversation.last_message
	return getMessage(root, options)
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
		this.front = new Front(this.options.token)
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
		return []
	}

	async translate (event) {
		if ([ 'inbound', 'outbound', 'out_reply' ].includes(event.data.payload.type)) {
			const thread = await this.getSupportThreadByMirrorId(getConversationMirrorId(event))
			if (!thread) {
				return this.recreateThreadFromEvent(event)
			}

			return [
				getMessageFromEvent(event, {
					actor: this.options.actor,
					type: 'message',
					target: thread.id
				})
			]
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
				return [
					getMessageFromEvent(event, {
						actor: this.options.actor,
						type: 'whisper',
						target: thread.id
					})
				]
			}

			const cards = await this.recreateThreadFromEvent(event)
			return cards.concat([
				getMessageFromEvent(event, {
					actor: this.options.actor,
					type: 'whisper',
					target: {
						$eval: 'cards[0].id'
					}
				})
			])
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
		const supportThreads = await this.context.query(this.options.session, {
			type: 'object',
			required: [ 'id', 'type', 'data' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'support-thread'
				},
				data: {
					type: 'object',
					required: [ 'mirrors' ],
					additionalProperties: true,
					properties: {
						mirrors: {
							type: 'array',
							contains: {
								type: 'string',
								const: id
							}
						}
					}
				}
			}
		})

		return _.first(supportThreads)
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
		const cards = [
			{
				time: getEpochDate(event.data.payload.conversation.created_at),
				card: {
					name: event.data.payload.conversation.subject.replace(/^Re:\s/, ''),
					type: 'support-thread',
					active: true,
					tags: [],
					links: {},
					data: {
						inbox: await this.getInbox(event),
						mirrors: [ getConversationMirrorId(event) ],
						mentionsUser: [],
						alertsUser: [],
						description: '',
						status: 'open'
					}
				}
			}
		]

		const message = getMessageFromEvent(event, {
			actor: this.options.actor,
			type: 'message',
			target: {
				$eval: 'cards[0].id'
			}
		})

		if (message && event.data.payload.type !== 'comment') {
			cards.push(message)
		}

		return cards
	}
}
