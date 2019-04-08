/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const uuid = require('uuid/v4')
const skhema = require('skhema')
const syncContext = require('./sync-context')
const errors = require('./errors')
const sync = require('@balena/jellysync')
const environment = require('../environment')
const logger = require('../logger').getLogger(__filename)

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

const mirror = async (type, session, context, card, request) => {
	// Don't sync back changes that came externally
	if (request.originator) {
		const originator = await context.getCardById(
			context.privilegedSession, request.originator)
		if (originator && originator.type === 'external-event') {
			logger.info(request.context, 'Not mirroring external event', {
				type,
				request
			})

			return []
		}
	}

	const cards = await sync.mirror(card, {
		actor: request.actor,
		integration: type,
		context: syncContext.fromWorkerContext(context, request.context, session),
		token: environment.getIntegrationToken(type)
	})

	return cards.map((element) => {
		return {
			id: element.id,
			type: element.type,
			slug: element.slug
		}
	})
}

module.exports = {
	'action-integration-import-event': {
		card: require('./actions/action-integration-import-event'),
		handler: async (session, context, card, request) => {
			const cards = await sync.translate(card, {
				actor: request.actor,
				timestamp: request.timestamp,
				context: syncContext.fromWorkerContext(context, request.context, session),
				token: environment.getIntegrationToken(card.data.source)
			})

			return cards.map((element) => {
				return {
					id: element.id,
					type: element.type,
					slug: element.slug
				}
			})
		}
	},
	'action-integration-github-mirror-event': {
		card: require('./actions/action-integration-github-mirror-event'),
		handler: async (session, context, card, request) => {
			return mirror('github', session, context, card, request)
		}
	},
	'action-integration-front-mirror-event': {
		card: require('./actions/action-integration-front-mirror-event'),
		handler: async (session, context, card, request) => {
			return mirror('front', session, context, card, request)
		}
	},
	'action-broadcast': {
		card: require('./actions/action-broadcast'),
		handler: async (session, context, card, request) => {
			const eventType = 'message'

			const sessionCard = await context.getCardById(
				context.privilegedSession, context.privilegedSession, {
					type: 'session'
				})

			if (!sessionCard) {
				throw new context.errors.WorkerNoElement('Privileged session is invalid')
			}

			const messages = await context.query(context.privilegedSession, {
				type: 'object',
				$$links: {
					'is attached to': {
						type: 'object',
						required: [ 'id' ],
						properties: {
							id: {
								type: 'string',
								const: card.id
							}
						}
					}
				},
				required: [ 'type', 'data' ],
				properties: {
					type: {
						type: 'string',
						const: eventType
					},
					data: {
						type: 'object',
						additionalProperties: true,
						required: [ 'payload', 'actor' ],
						properties: {
							actor: {
								type: 'string',
								const: sessionCard.data.actor
							},
							payload: {
								type: 'object',
								required: [ 'message' ],
								properties: {
									message: {
										type: 'string',
										const: request.arguments.message
									}
								}
							}
						}
					}
				}
			})

			if (messages.length > 0) {
				return null
			}

			const eventRequest = Object.assign({}, request)
			eventRequest.arguments = {
				slug: context.getEventSlug(`broadcast-${eventType}`),
				type: eventType,
				payload: {
					mentionsUser: [],
					alertsUser: [],
					message: request.arguments.message
				}
			}

			/*
			 * Broadcast messages are posted by a high privilege user.
			 */
			return module.exports['action-create-event'].handler(
				context.privilegedSession, context, card, eventRequest)
		}
	},
	'action-ping': {
		card: require('./actions/action-ping'),
		handler: async (session, context, card, request) => {
			const result = await context.insertCard(session, card, {
				timestamp: request.timestamp,
				actor: request.actor,
				originator: request.originator,
				reason: 'Ping',

				// So that we don't infinitely materialize links
				// in the ping card.
				attachEvents: false,

				override: true
			}, {
				slug: request.arguments.slug,
				version: '1.0.0',
				data: {
					timestamp: request.timestamp
				}
			})

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-create-card': {
		card: require('./actions/action-create-card'),
		handler: async (session, context, card, request) => {
			if (skhema.isValid(context.cards.event.data.schema, request.arguments.properties)) {
				throw new Error('You may not use card actions to create an event')
			}

			if (!request.arguments.properties.slug) {
				// Auto-generate a slug by joining the type, the name, and a uuid
				request.arguments.properties.slug =
					slugify(`${card.slug}-${request.arguments.properties.name || ''}-${uuid()}`)
			}

			const result = await context.insertCard(session, card, {
				timestamp: request.timestamp,
				actor: request.actor,
				originator: request.originator,
				reason: request.arguments.reason,
				attachEvents: true,
				override: false
			}, request.arguments.properties)

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-upsert-card': {
		card: require('./actions/action-upsert-card'),
		handler: async (session, context, card, request) => {
			if (skhema.isValid(context.cards.event.data.schema, request.arguments.properties)) {
				throw new Error('You may not use card actions to create an event')
			}

			const result = await context.insertCard(session, card, {
				timestamp: request.timestamp,
				actor: request.actor,
				originator: request.originator,
				reason: request.arguments.reason,
				attachEvents: true,
				override: true
			}, request.arguments.properties)

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-create-session': {
		card: require('./actions/action-create-session'),
		errors: {
			onMissingInput: (options) => {
				throw new errors.AuthenticationError(
					`No such user: ${options.card}`, options.context)
			}
		},
		handler: async (session, context, card, request) => {
			const user = await context.getCardById(
				context.privilegedSession, card.id, {
					type: 'user'
				})

			if (!user) {
				throw new context.errors.WorkerAuthenticationError(`No such user: ${card.id}`)
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

			const result = await context.insertCard(
				context.privilegedSession, sessionTypeCard, {
					timestamp: request.timestamp,
					actor: request.actor,
					originator: request.originator,
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

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-create-user': {
		card: require('./actions/action-create-user'),
		handler: async (session, context, card, request) => {
			try {
				const result = await context.insertCard(session, card, {
					timestamp: request.timestamp,
					actor: request.actor,
					originator: request.originator,
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

				if (!result) {
					return null
				}

				return {
					id: result.id,
					type: result.type,
					slug: result.slug
				}
			} catch (error) {
				if (error.name === 'JellyfishElementAlreadyExists' &&
					error.slug === request.arguments.username) {
					error.expected = true
				}

				throw error
			}
		}
	},
	'action-create-event': {
		card: require('./actions/action-create-event'),
		handler: async (session, context, card, request) => {
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
				originator: request.originator,
				attachEvents: false,
				override: false
			}, {
				slug: request.arguments.slug || context.getEventSlug(typeCard.slug),
				version: '1.0.0',
				name: request.arguments.name || null,
				tags: request.arguments.tags || [],

				// Events always inherit the head cards markers
				markers: fullCard.markers,
				data
			}).catch((error) => {
				// This is a user error
				if (error.name === 'JellyfishElementAlreadyExists') {
					error.expected = true
				}

				throw error
			})

			const linkTypeCard = await context.getCardBySlug(session, 'link', {
				type: 'type'
			})

			// Create a link card between the event and its target
			await context.insertCard(session, linkTypeCard, {
				timestamp: request.timestamp,
				actor: request.actor,
				originator: request.originator,
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

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-set-add': {
		card: require('./actions/action-set-add'),
		handler: async (session, context, card, request) => {
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
				return {
					id: card.id,
					type: card.type,
					slug: card.slug
				}
			}

			const typeCard = await context.getCardBySlug(session, card.type, {
				type: 'type'
			})

			_.set(card, request.arguments.property, source)
			const result = await context.insertCard(session, typeCard, {
				timestamp: request.timestamp,
				actor: request.actor,
				originator: request.originator,
				attachEvents: true,
				override: true
			}, card)

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-delete-card': {
		card: require('./actions/action-delete-card'),
		handler: async (session, context, card, request) => {
			if (!card.active) {
				return {
					id: card.id,
					type: card.type,
					slug: card.slug
				}
			}

			card.active = false

			const typeCard = await context.getCardBySlug(session, card.type, {
				type: 'type'
			})

			if (!typeCard) {
				throw new context.errors.WorkerNoElement(`No such type: ${card.type}`)
			}

			const result = await context.insertCard(
				context.privilegedSession, typeCard, {
					timestamp: request.timestamp,
					actor: request.actor,
					originator: request.originator,
					attachEvents: true,
					override: true
				}, _.omit(card, [ 'type' ]))

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	},
	'action-update-card': {
		card: require('./actions/action-update-card'),
		handler: async (session, context, card, request) => {
			const updatedCard = _.mergeWith({}, card, request.arguments.properties, (objectValue, sourceValue) => {
				if (_.isArray(objectValue)) {
					return sourceValue
				}

				// This lodash function expects undefined
				// eslint-disable-next-line no-undefined
				return undefined
			})

			if (_.isEqual(card, updatedCard)) {
				return {
					id: card.id,
					type: card.type,
					slug: card.slug
				}
			}

			const typeCard = await context.getCardBySlug(session, updatedCard.type, {
				type: 'type'
			})

			if (!typeCard) {
				throw new context.errors.WorkerNoElement(
					`No such type: ${updatedCard.type}`)
			}

			const result = await context.insertCard(session, typeCard, {
				timestamp: request.timestamp,
				reason: request.arguments.reason,
				actor: request.actor,
				originator: request.originator,
				attachEvents: true,
				override: true
			}, _.omit(updatedCard, [ 'type' ]))

			if (!result) {
				return null
			}

			return {
				id: result.id,
				type: result.type,
				slug: result.slug
			}
		}
	}
}
