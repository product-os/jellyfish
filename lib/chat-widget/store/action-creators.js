/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as uuid from 'uuid'
import * as helpers from '../../ui-components/services/helpers'
import {
	FILE_PROXY_MESSAGE
} from '../../ui-components/Timeline'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './action-types'
import {
	selectCardById,
	selectCurrentUser,
	selectThreads
} from './selectors'

// Card exists here until it's loaded
const loadingCardCache = {}

export const setCards = (ctx) => {
	return (cards) => {
		ctx.store.dispatch({
			type: SET_CARDS,
			payload: cards
		})
	}
}

export const initiateThread = (ctx) => {
	return async ({
		subject, text, files
	}) => {
		const state = ctx.store.getState()
		const currentUser = selectCurrentUser()(state)
		const markers = [ `${currentUser.slug}+org-balena` ]

		const thread = await ctx.sdk.card.create({
			type: 'support-thread',
			name: subject,
			markers,
			data: {
				product: state.product,
				status: 'open'
			}
		})

		const messageSymbolRE = /^\s*%\s*/
		const mentions = helpers.getUserSlugsByPrefix('@', text)
		const alerts = helpers.getUserSlugsByPrefix('!', text)
		const tags = helpers.findWordsByPrefix('#', text).map((tag) => {
			return tag.slice(1).toLowerCase()
		})

		const newMessage = {
			target: thread,
			type: 'message',
			slug: `message-${uuid()}`,
			tags,
			payload: {
				mentionsUser: mentions,
				alertsUser: alerts,
				message: text.replace(messageSymbolRE, '')
			}
		}

		if (files.length) {
			newMessage.payload.file = files[0]
			newMessage.payload.message += `\n${FILE_PROXY_MESSAGE} ${helpers.createPermaLink(thread)}`
		}

		const message = await ctx.sdk.event.create(newMessage)

		return {
			thread,
			message
		}
	}
}

export const fetchThread = (ctx) => {
	return async (id) => {
		const thread = await ctx.sdk.card.getWithTimeline(id)
		setCards(ctx)([ thread ])
		setCards(ctx)(thread.links['has attached element'])
		return thread
	}
}

export const fetchThreads = (ctx) => {
	return async ({
		limit
	}) => {
		const state = ctx.store.getState()

		const threads = await ctx.sdk.query(
			{
				$$links: {
					'has attached element': {
						type: 'object',
						additionalProperties: true
					}
				},
				properties: {
					links: {
						type: 'object',
						additionalProperties: true
					},
					type: {
						const: 'support-thread@1.0.0'
					},
					active: {
						const: true
					},
					data: {
						properties: {
							product: {
								const: state.product
							}
						},
						required: [
							'product'
						]
					}
				},
				additionalProperties: true
			},
			{
				skip: selectThreads()(state).length,
				limit,
				sortBy: [ 'created_at' ],
				sortDir: 'desc'
			}
		)

		setCards(ctx)(
			threads.reduce((cards, thread) => {
				return cards.concat(thread, thread.links['has attached element'])
			}, [])
		)
	}
}

export const setCurrentUser = (ctx) => {
	return async () => {
		const currentUser = await ctx.sdk.auth.whoami()

		ctx.store.dispatch({
			type: SET_CURRENT_USER,
			payload: currentUser
		})
	}
}

export const getActor = (ctx) => {
	return async (id) => {
		const actor = await getCard(ctx)(id, 'user')
		const state = ctx.store.getState()

		if (!actor) {
			return null
		}

		const email = _.get(actor, [ 'data', 'email' ], '')

		let name = ''

		/* Get user name to display with priorities:
		 * 1. profile.name
		 * 2. email
		 * 3. slug
		 */
		const profileName = _.get(actor, [ 'data', 'profile', 'name' ])

		if (profileName && (profileName.first || profileName.last)) {
			name = _.compact([ profileName.first, profileName.last ]).join(' ')
		} else if (email && email.length) {
			name = _.isArray(email) ? email.join(', ') : email
		} else {
			name = actor.slug.replace(/^(account|user)-/, '')
		}

		const currentUser = selectCurrentUser()(state)

		return {
			name,
			email,
			avatarUrl: _.get(actor, [ 'data', 'avatar' ]),
			proxy: actor.id !== _.get(currentUser, [ 'id' ]),
			card: actor
		}
	}
}

export const addNotification = () => {
	return (...args) => {
		console.log('addNotification', args)
	}
}

export const getCard = (ctx) => {
	// Type argument is included to keep this method signature
	// the same as the corresponding Jellyfish action
	return async (id, type) => {
		const state = ctx.store.getState()
		let card = selectCardById(id)(state)
		if (!card) {
			if (!Reflect.has(loadingCardCache, id)) {
				const schema = {
					type: 'object',
					properties: {
						id: {
							const: id
						}
					},
					additionalProperties: true
				}

				// TODO: Make this generic. Will require some thought
				// as to how to handle different requests for the same
				// card with different links required. For now we always
				// fetch the user's org with the user.
				if (type.split('@')[0] === 'user') {
					schema.$$links = {
						'is member of': {
							type: 'object',
							additionalProperties: true
						}
					}
				}
				loadingCardCache[id] = ctx.sdk.query(
					schema,
					{
						limit: 1
					}
				).then((result) => {
					if (result.length) {
						return result[0]
					}
					return ctx.sdk.card.get(id)
				}).finally(() => {
					Reflect.deleteProperty(loadingCardCache, id)
				})
			}

			card = await loadingCardCache[id]

			ctx.store.dispatch({
				type: SET_CARDS,
				payload: [ card ]
			})
		}
		return card
	}
}
