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
const sync = require('./sync')
const GitHubIntegration = require('./integrations/github')
const FrontIntegration = require('./integrations/front')

module.exports = {
	'action-create-card': async (session, context, card, request) => {
		return context.insertCard(session, card, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false
		}, request.arguments.properties)
	},
	'action-create-session': async (session, context, card, request) => {
		const user = await context.getCardById(context.privilegedSession, card.id)
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

		return context.insertCard(session, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: false,
			override: false
		}, {
			version: '1.0.0',
			data: {
				timestamp: request.timestamp,
				target: card.id,
				actor: request.actor,
				payload: request.arguments.payload
			}
		})
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
	},
	'action-integration-github-import-event': async (session, context, card, request) => {
		const token = process.env.INTEGRATION_GITHUB_TOKEN
		if (!token) {
			return []
		}

		const username = GitHubIntegration.getLocalUser(card)
		const userCard = await context.getCardBySlug(context.privilegedSession, username, {
			type: 'user'
		})

		const actor = userCard ? userCard.id : request.actor
		return sync.translateExternalEvent(GitHubIntegration, card, {
			actor,
			token,
			context,
			session
		})
	},
	'action-integration-github-mirror-event': async (session, context, card, request) => {
		const token = process.env.INTEGRATION_GITHUB_TOKEN
		if (!token) {
			return []
		}

		return sync.mirrorCard(GitHubIntegration, card, {
			actor: request.actor,
			token,
			context,
			session
		})
	},
	'action-integration-front-import-event': async (session, context, card, request) => {
		const token = process.env.INTEGRATION_FRONT_TOKEN
		if (!token) {
			return []
		}

		let actor = request.actor
		const localUser = FrontIntegration.getLocalUser(card)
		if (localUser.type === 'user') {
			const userCard = await context.getCardBySlug(context.privilegedSession, `${localUser.type}-${localUser.username}`, {
				type: localUser.type
			})

			if (userCard) {
				actor = userCard.id
			}
		} else if (localUser.type === 'account') {
			const slug = `${localUser.type}-${localUser.email.replace(/[@|.]/g, '-')}`
			const account = await context.getCardBySlug(context.privilegedSession, slug, {
				type: localUser.type
			})

			if (account) {
				actor = account.id
			} else {
				const typeCard = await context.getCardBySlug(session, localUser.type, {
					type: 'type'
				})

				if (!typeCard) {
					throw new context.errors.WorkerNoElement(`No such type: ${localUser.type}`)
				}

				const result = await context.insertCard(context.privilegedSession, typeCard, {
					timestamp: request.timestamp,
					actor: request.actor,
					attachEvents: true,
					override: false
				}, {
					slug,
					version: '1.0.0',
					data: {
						email: localUser.email
					}
				})

				actor = result.id
			}
		}

		return sync.translateExternalEvent(FrontIntegration, card, {
			actor,
			token,
			context,
			session
		})
	},
	'action-integration-front-mirror-event': async (session, context, card, request) => {
		const token = process.env.INTEGRATION_FRONT_TOKEN
		if (!token) {
			return []
		}

		return sync.mirrorCard(FrontIntegration, card, {
			actor: request.actor,
			token,
			context,
			session
		})
	}
}
