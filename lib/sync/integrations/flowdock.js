/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const crypto = require('crypto')
const Bluebird = require('bluebird')
const LRU = require('lru-cache')
const _ = require('lodash')

const FLOWDOCK_USER_CACHE = new LRU(200)

module.exports = class FlowdockIntegration {
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
		if (!this.options.token ||
			!this.options.token.api ||
			!this.options.token.signature) {
			return []
		}
		if (!isEventActionable(event)) {
			return []
		}

		const sequence = []
		const headers = {
			Authorization: `Basic ${Buffer.from(this.options.token.api).toString('base64')}`
		}
		const adminActorId = await this.context.getActorId({
			handle: this.options.defaultUser
		})

		// Get flowdock user
		const flowdockUser = await this.context.request(adminActorId, {
			method: 'GET',
			json: true,
			uri: `https://api.flowdock.com/users/${event.data.payload.user}`,
			headers
		})

		const eventActorId = await this.context.getActorId({
			handle: flowdockUser.body.nick.toLowerCase().replace(/_/g, '-'),
			name: flowdockUser.body.name,
			email: flowdockUser.body.email
		})

		// TODO we can cache these requests
		// Request flow data from flowdock API in order to construct the mirrorId.
		const flowData = await this.context.request(adminActorId, {
			method: 'GET',
			json: true,
			uri: `https://api.flowdock.com/flows/find?id=${event.data.payload.flow}`,
			headers
		})

		// Use this to construct the mirrorId if the event is type of tag-change
		// Just the event doesn't contain enough information
		if ([ 'message-edit', 'tag-change' ].includes(event.data.payload.event)) {
			const messageData = await this.context.request(adminActorId, {
				method: 'GET',
				json: true,
				uri: `${flowData.body.url}/messages/${event.data.payload.content.message}`,
				headers
			})

			// Mutate current event object with message data
			event.data.payload.thread_id = messageData.body.thread_id
			event.data.payload.thread = messageData.body.thread
			event.data.payload.id = messageData.body.id
			event.data.payload.messageData = messageData
		}
		const flowThreadMirrorId = `${flowData.body.url}/threads/${event.data.payload.thread_id}`

		// Check if there is an element of type thread in JF.
		const threadCard = await this.context.getElementByMirrorId(
			'thread@1.0.0', flowThreadMirrorId)

		if (!threadCard && event.data.payload.id === event.data.payload.thread.initial_message) {
			const thread = {
				time: new Date(event.data.payload.created_at),
				actor: eventActorId,
				card: {
					name: '',
					type: 'thread@1.0.0',
					slug: slugify(event, 'thread'),
					active: true,
					tags: [],
					requires: [],
					capabilities: [],
					data: {
						mirrors: [
							flowThreadMirrorId
						],
						flow: flowData.body.parameterized_name,
						mentionsUser: [],
						alertsUser: [],
						description: ''
					}
				}
			}
			sequence.push(thread)
		}

		if ([ 'message', 'message-edit', 'tag-change' ].includes(event.data.payload.event)) {
			const messageMirrorId = `${flowThreadMirrorId}/messages/${event.data.payload.id}`
			const type = getMessageType(event)
			let messageCard = await this.context.getElementByMirrorId(type, messageMirrorId)
			const target = threadCard || {
				id: {
					$eval: 'cards[0].id'
				}
			}
			if (messageCard) {
				messageCard.data.payload.message = getMessageContent(event)
				messageCard.data.payload.mentionsUser =
					await getMentions(event, this.context, adminActorId, headers, event.data.payload.messageData.body.tags)
				messageCard.tags = getTags(event)
				messageCard.data.timestamp = event.data.payload.created_at
				const readBy = await getReadByArray(event, this.context, adminActorId, headers)
				if (!_.isEmpty(readBy)) {
					messageCard.data.payload.readBy = readBy
				}
			} else {
				messageCard = {
					name: '',
					type,
					slug: slugify(event, type),
					active: true,
					tags: getTags(event),
					requires: [],
					capabilities: [],
					data: {
						mirrors: [
							messageMirrorId
						],
						payload: {
							message: getMessageContent(event),
							mentionsUser: await getMentions(event, this.context, adminActorId, headers),
							alertsUser: []
						},
						timestamp: event.data.payload.created_at,
						actor: eventActorId,
						target: target.id
					}
				}
			}
			const readBy = await getReadByArray(event, this.context, adminActorId, headers)
			if (!_.isEmpty(readBy)) {
				messageCard.data.payload.readBy = readBy
			}
			sequence.push({
				time: new Date(event.data.payload.created_at),
				actor: eventActorId,
				card: messageCard
			})
		}

		if (event.data.payload.event === 'file') {
			const messageMirrorId = `${flowThreadMirrorId}/messages/${event.data.payload.id}`
			const type = 'whisper@1.0.0'
			let messageCard = await this.context.getElementByMirrorId(type, messageMirrorId)
			const target = threadCard || {
				id: {
					$eval: 'cards[0].id'
				}
			}
			if (!messageCard) {
				let message = `[${event.data.payload.content.file_name}](https://www.flowdock.com/rest${event.data.payload.content.path})`
				if ('image' in event.data.payload.content) {
					message = `!${message}`
				}
				messageCard = {
					name: '',
					type,
					slug: slugify(event, type),
					active: true,
					tags: [],
					requires: [],
					capabilities: [],
					data: {
						mirrors: [
							messageMirrorId
						],
						payload: {
							message,
							mentionsUser: [],
							alertsUser: []
						},
						timestamp: event.data.payload.created_at,
						actor: eventActorId,
						target: target.id
					}
				}
			}
			sequence.push({
				time: new Date(event.data.payload.created_at),
				actor: eventActorId,
				card: messageCard
			})
		}

		return sequence
	}
}

const slugify = (event, type) => {
	const typeBase = type.split('@')[0]
	const baseSlug = `${typeBase}-flowdock-${event.data.payload.thread_id.toLowerCase().replace(/_/g, '-')}`
	return typeBase === 'thread' ? baseSlug : `${baseSlug}-${event.data.payload.id}`
}

const getRawContent = (event) => {
	return 'messageData' in event.data.payload
		? event.data.payload.messageData.body.content
		: event.data.payload.content
}

const getMessageType = (event) => {
	return getRawContent(event).trimStart().startsWith('%')
		? 'message@1.0.0'
		: 'whisper@1.0.0'
}

const getMessageContent = (event) => {
	return (getRawContent(event).trimStart().replace(new RegExp('^[%]+'), '').trimStart())
}

const getReadIds = (event) => {
	const flowdockTags = getFlowdockTags(event)
	const userIds = getUserIds(flowdockTags)
	const unreadIds = getUserIds(flowdockTags, 'unread')
	return _.difference(userIds, unreadIds)
}

const getReadByArray = async (event, context, actorId, headers) => {
	const readIds = getReadIds(event)
	const users = await Promise.all(_.map(readIds, (id) => {
		return getFlowdockUsernameById(context, actorId, headers, id)
	}))
	return users
}

const getFlowdockTags = (event) => {
	return 'messageData' in event.data.payload
		? event.data.payload.messageData.body.tags
		: event.data.payload.tags
}

const getTags = (event) => {
	const tags = _.filter(getFlowdockTags(event), (tag) => {
		return !tag.startsWith(':')
	})
	return tags
}

const getUserIds = (flowdockTags, tagName = 'user') => {
	const prefix = `:${tagName}:`
	return _.chain(flowdockTags).filter((tag) => {
		return tag.match(new RegExp(prefix))
	}).invokeMap(String.prototype.replace, prefix, '').value()
}

const getMentions = async (event, context, actorId, headers, flowdockTags = event.data.payload.tags) => {
	if (_.isEmpty(flowdockTags)) {
		return []
	}
	return Promise.all(_.map(getUserIds(flowdockTags), (id) => {
		return getFlowdockUsernameById(context, actorId, headers, id)
	}))
}

const getFlowdockUsernameById = async (context, actorId, headers, id) => {
	const cachedUser = FLOWDOCK_USER_CACHE.get(id)
	if (cachedUser) {
		return cachedUser.nick
	}
	const user = await context.request(actorId, {
		method: 'GET',
		json: true,
		uri: `https://api.flowdock.com/users/${id}`,
		headers
	})
	FLOWDOCK_USER_CACHE.set(id, user.body)
	return user.body.nick
}

const isEventActionable = (event) => {
	const actionableEvents = [ 'message', 'message-edit', 'file', 'tag-change' ]

	// Removed emoji-reaction since JF doesn't currently support emoji-reactions
	return actionableEvents.includes(event.data.payload.event)
}

module.exports.isEventValid = (token, rawEvent, headers) => {
	const signature = headers['x-flowdock-signature']
	if (!signature || !token || !token.signature) {
		return false
	}

	const hash = crypto.createHmac('sha1', token.signature)
		.update(rawEvent)
		.digest('hex')
	return signature === `sha1=${hash}`
}
