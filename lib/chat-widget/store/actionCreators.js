import _ from 'lodash'
import * as uuid from 'uuid'
import * as helpers from '../../ui/services/helpers'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './actionTypes'
import {
	selectCardById,
	selectThreads,
	selectCurrentUser
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
		const thread = await ctx.sdk.card.create({
			type: 'support-thread',
			name: subject
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
						const: 'support-thread'
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

		setCards(ctx)(threads)
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

export const signalTyping = (ctx) => {
	return (card) => {
		const user = selectCurrentUser()(ctx.store.getState())
		ctx.stream.type(user.slug, card)
	}
}

export const setTimelineMessage = () => {
	return _.noop
}

export const getActor = (ctx) => {
	return async (id) => {
		let actor = selectCardById(id)(ctx.store.getState())

		if (actor) {
			return actor
		}

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
				handle = email === 'new@change.me' || email
					? actor.slug.replace(/^(account|user)-/, '')
					: email
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
