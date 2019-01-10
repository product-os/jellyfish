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
const environment = require('../environment')

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

module.exports = {
	'action-integration-import-event': async (session, context, card, request) => {
		return sync.translate(card, {
			actor: request.actor,
			timestamp: request.timestamp,
			context: syncContext.fromWorkerContext(context, request.context, session),
			token: environment.getIntegrationToken(card.data.source)
		})
	},
	'action-integration-github-mirror-event': async (session, context, card, request) => {
		return sync.mirror(card, {
			actor: request.actor,
			integration: 'github',
			context: syncContext.fromWorkerContext(context, request.context, session),
			token: environment.getIntegrationToken('github')
		})
	},
	'action-integration-front-mirror-event': async (session, context, card, request) => {
		return sync.mirror(card, {
			actor: request.actor,
			integration: 'front',
			context: syncContext.fromWorkerContext(context, request.context, session),
			token: environment.getIntegrationToken('front')
		})
	},
	'action-create-card': async (session, context, card, request) => {
		if (skhema.isValid(context.cards.event.data.schema, request.arguments.properties)) {
			throw new Error('You may not use card actions to create an event')
		}

		if (!request.arguments.properties.slug) {
			// Auto-generate a slug by joining the type, the name, and a uuid
			request.arguments.properties.slug =
				slugify(`${card.slug}-${request.arguments.properties.name || ''}-${uuid()}`)
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

		// In most cases, the `card` argument will contain all the information we
		// need, but in some instances (for example when the guest user session
		// creates a new user), `card` will be missing certain fields due to
		// a permission filter being applied. The full card is loaded using
		// a privileged sessions so that we can ensure all required fields are
		// present.
		const fullCard = await context.getCardById(
			context.privilegedSession,
			card.id, {
				type: card.type
			}
		)

		if (!typeCard) {
			throw new Error(`No such type: ${request.arguments.type}`)
		}

		const data = {
			timestamp: request.timestamp,
			target: fullCard.id,
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

			// Events always inherit the head cards markers
			markers: fullCard.markers,
			data
		})

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
					id: fullCard.id,
					type: fullCard.type
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
