/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as uuid from 'uuid'
import * as helpers from '@jellyfish/ui-components/services/helpers'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './action-types'
import {
	selectCardById,
	selectCurrentUser,
	selectThreads
} from './selectors'

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
						enum: [ 'support-thread', 'support-thread@1.0.0' ]
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
		let actor = selectCardById(id)(ctx.store.getState())

		if (!actor) {
			const result = await ctx.sdk.query({
				$$links: {
					'is member of': {
						type: 'object'
					}
				},
				type: 'object',
				properties: {
					id: {
						const: id
					}
				},
				additionalProperties: true
			}, {
				limit: 1
			})

			if (result.length) {
				actor = result[0]
			} else {
				actor = await ctx.sdk.card.get(id)
			}
		}

		if (!actor) {
			return null
		}

		setCards(ctx)([ actor ])

		const email = _.get(actor, [ 'data', 'email' ], '')

		const isBalenaTeam = _.find(
			_.get(actor, [ 'links', 'is member of' ], []),
			{
				slug: 'org-balena'
			}
		)

		// IF proxy is true, it indicates that the actor has been created as a proxy
		// for a real user in JF, usually as a result of syncing from an external
		// service
		let proxy = false
		let name = ''

		// Check if the user is part of the balena org
		if (isBalenaTeam) {
			name = actor.name || actor.slug.replace('user-', '')
		} else {
			proxy = true
			let handle = actor.name || _.get(actor, [ 'data', 'handle' ])
			if (!handle) {
				handle = email || actor.slug.replace(/^(account|user)-/, '')
			}
			name = `[${handle}]`
		}

		return {
			name,
			email,
			avatarUrl: _.get(actor, [ 'data', 'avatar' ]),
			proxy,
			card: actor
		}
	}
}

export const addNotification = () => {
	return (...args) => {
		console.log('addNotification', args)
	}
}
