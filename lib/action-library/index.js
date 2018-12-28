/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

const _ = require('lodash')
const uuid = require('uuid/v4')
const skhema = require('skhema')
const syncContext = require('./sync-context')
const sync = require('../sync')
const CARDS = require('../core/cards')

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

const assertNotEvent = async (card) => {
	const event = await CARDS.event
	if (skhema.isValid(event.data.schema, card)) {
		throw new Error('You may not use card actions to create an event')
	}
}

module.exports = {
	'action-integration-import-event': async (session, context, card, request) => {
		return sync.translate(syncContext(session, context), card, request)
	},
	'action-integration-github-mirror-event': async (session, context, card, request) => {
		return sync.mirror('github', syncContext(session, context), card, request)
	},
	'action-integration-front-mirror-event': async (session, context, card, request) => {
		return sync.mirror('front', syncContext(session, context), card, request)
	},
	'action-create-card': async (session, context, card, request) => {
		await assertNotEvent(request.arguments.properties)

		if (!request.arguments.properties.slug) {
			// Auto-generate a slug by joining the type, the name, and a uuid
			request.arguments.properties.slug = slugify(`${card.slug}-${request.arguments.properties.name || ''}-${uuid()}`)
		}

		return context.insertCard(session, card, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false
		}, request.arguments.properties)
	},
	'action-create-session': async (session, context, card, request) => {
		const user = await context.getCardById(
			context.privilegedSession, card.id, {
				type: 'user'
			})

		if (!user) {
			throw new context.errors.ActionsAuthenticationError(`No such user: ${card.id}`)
		}

		if (user.data.disallowLogin) {
			throw new context.errors.WorkerAuthenticationError('Login disallowed')
		}

		if (user.data.password && request.arguments.password.hash !== user.data.password.hash) {
			throw new context.errors.WorkerAuthenticationError('Invalid password')
		}

		const sessionTypeCard = await context.getCardBySlug(session, 'session', {
			type: 'type'
		})

		if (!sessionTypeCard) {
			throw new context.errors.WorkerNoElement('No such type: session')
		}

		// Set the expiration date to be 7 days from now
		const expirationDate = new Date()
		expirationDate.setDate(expirationDate.getDate() + 7)

		return context.insertCard(context.privilegedSession, sessionTypeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false
		}, {
			version: '1.0.0',
			slug: `session-${user.slug}-${request.epoch}`,
			data: {
				actor: card.id,
				expiration: expirationDate.toISOString()
			}
		})
	},
	'action-create-user': async (session, context, card, request) => {
		return context.insertCard(session, card, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false
		}, {
			slug: request.arguments.username,
			version: '1.0.0',
			data: {
				email: request.arguments.email,
				roles: [ 'user-community' ],
				password: {
					hash: request.arguments.hash
				}
			}
		})
	},
	'action-create-event': async (session, context, card, request) => {
		const typeCard = await context.getCardBySlug(session, request.arguments.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new Error(`No such type: ${request.arguments.type}`)
		}

		const data = {
			timestamp: request.timestamp,
			target: card.id,
			actor: request.actor,
			payload: request.arguments.payload
		}

		const result = await context.insertCard(session, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: false,
			override: false
		}, {
			slug: request.arguments.slug || context.getEventSlug(typeCard.slug),
			version: '1.0.0',
			tags: request.arguments.tags || [],
			markers: request.arguments.markers || [],
			data
		})

		// Various performance optimisations to infer the target type
		// of the most common events that go through this code path
		let targetType = null
		if (result.type === 'create' || result.type === 'update') {
			targetType = result.data.payload.type
		} else if (result.type === 'execute') {
			targetType = 'action'
		} else {
			const target = await context.getCardById(session, result.data.target) ||
				await context.getCardBySlug(session, result.data.target)

			targetType = target ? target.type : 'card'
		}

		const linkTypeCard = await context.getCardBySlug(session, 'link', {
			type: 'type'
		})

		// Create a link card between the event and its target
		await context.insertCard(session, linkTypeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: false,
			override: false
		}, {
			slug: context.getEventSlug('link', data),
			type: 'link',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: result.id,
					type: result.type
				},
				to: {
					id: card.id,
					type: targetType
				}
			}
		})

		return result
	},
	'action-set-add': async (session, context, card, request) => {
		const source = _.get(card, request.arguments.property, [])
		const initialLength = source.length
		const input = _.isArray(request.arguments.value)
			? request.arguments.value
			: [ request.arguments.value ]

		for (const element of input) {
			if (!_.includes(source, element)) {
				source.push(element)
			}
		}

		if (initialLength === source.length) {
			return card
		}

		const typeCard = await context.getCardBySlug(session, card.type, {
			type: 'type'
		})

		_.set(card, request.arguments.property, source)
		return context.insertCard(session, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: true
		}, card)
	},
	'action-delete-card': async (session, context, card, request) => {
		if (!card.active) {
			return card
		}

		card.active = false

		const typeCard = await context.getCardBySlug(session, card.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new context.errors.WorkerNoElement(`No such type: ${card.type}`)
		}

		return context.insertCard(session, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: true
		}, _.omit(card, [ 'type' ]))
	},
	'action-update-card': async (session, context, card, request) => {
		const updatedCard = _.mergeWith({}, card, request.arguments.properties, (objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue
			}

			// This lodash function expects undefined
			// eslint-disable-next-line no-undefined
			return undefined
		})

		if (_.isEqual(card, updatedCard)) {
			return card
		}

		const typeCard = await context.getCardBySlug(session, updatedCard.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new context.errors.WorkerNoElement(`No such type: ${updatedCard.type}`)
		}

		return context.insertCard(session, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: true
		}, _.omit(updatedCard, [ 'type' ]))
	}
}
