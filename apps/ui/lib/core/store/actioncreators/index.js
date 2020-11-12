/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

import * as Bluebird from 'bluebird'
import immutableUpdate from 'immutability-helper'
import clone from 'deep-copy'
import * as fastEquals from 'fast-equals'
import merge from 'deepmerge'
import {
	once
} from 'events'
import * as _ from 'lodash'
import {
	v4 as uuid
} from 'uuid'
import {
	v4 as isUUID
} from 'is-uuid'
import {
	addNotification,
	helpers
} from '@balena/jellyfish-ui-components'
import actions from '../actions'
import {
	getQueue
} from '../async-dispatch-queue'
import {
	getUnreadQuery
} from '../../queries'
import {
	streamUpdate
} from './stream/update'
import {
	streamTyping
} from './stream/typing'

// Refresh the session token once every 3 hours
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 60 * 1000

const asyncDispatchQueue = getQueue()

const allGroupsWithUsersQuery = {
	type: 'object',
	description: 'Get all groups with member user slugs',
	required: [ 'type', 'name' ],
	$$links: {
		'has group member': {
			type: 'object',
			required: [ 'slug' ],
			properties: {
				slug: {
					type: 'string'
				}
			},
			additionalProperties: false
		}
	},
	properties: {
		type: {
			const: 'group@1.0.0'
		}
	}
}

const createChannel = (data = {}) => {
	const id = uuid()
	if (!data.hasOwnProperty('canonical')) {
		data.canonical = true
	}

	return {
		id,
		created_at: new Date().toISOString(),
		slug: `channel-${id}`,
		type: 'channel',
		active: true,
		data
	}
}

/**
 * @summary Convert a string into a 32bit hashcode
 *
 * @param {String} input - The input source to hash
 *
 * @returns {Number} - A 32bit integer
 */
const hashCode = (input) => {
	let hash = 0
	let iteration = 0
	let character = ''
	if (input.length === 0) {
		return hash
	}
	for (iteration; iteration < input.length; iteration++) {
		character = input.charCodeAt(iteration)

		// eslint-disable-next-line no-bitwise
		hash = ((hash << 5) - hash) + character

		// Convert to 32bit integer
		// eslint-disable-next-line no-bitwise
		hash |= 0
	}
	return hash
}

const loadSchema = async (sdk, query, user) => {
	if (_.isString(query)) {
		return sdk.card.get(query, {
			type: 'view'
		})
			.then((card) => {
				return helpers.getViewSchema(card, user)
			})
	}
	if (query.type === 'view' || query.type === 'view@1.0.0') {
		return helpers.getViewSchema(query, user)
	}
	return clone(query)
}

const getViewId = (query) => {
	if (!query) {
		console.trace(query)
	}
	if (_.isString(query)) {
		return query
	}
	if (query.id) {
		return query.id
	}
	if (query.slug) {
		return query.slug
	}
	return `${hashCode(JSON.stringify(query))}`
}

export const selectors = {
	getFlow: (flowId, cardId) => (state) => { return _.get(state.ui, [ 'flows', flowId, cardId ]) || null },
	getCard: (id, type) => (state) => { return _.get(state.core, [ 'cards', type.split('@')[0], id ]) || null },
	getAccounts: (state) => { return state.core.accounts },
	getOrgs: (state) => { return state.core.orgs },
	getAppVersion: (state) => { return _.get(state.core, [ 'config', 'version' ]) || null },
	getAppCodename: (state) => { return _.get(state.core, [ 'config', 'codename' ]) || null },
	getChannels: (state) => { return state.core.channels },
	getCurrentUser: (state) => { return _.get(state.core, [ 'session', 'user' ]) || null },
	getCurrentUserStatus: (state) => { return _.get(state.core, [ 'session', 'user', 'data', 'status' ]) || null },
	getSessionToken: (state) => { return _.get(state.core, [ 'session', 'authToken' ]) || null },
	getStatus: (state) => { return state.core.status },
	getTimelineMessage: (state, target) => {
		return _.get(state.ui, [ 'timelines', target, 'message' ], '')
	},
	getChatWidgetOpen: (state) => {
		return _.get(state.ui, [ 'chatWidget', 'open' ])
	},
	getTypes: (state) => { return state.core.types },
	getGroups: (state) => { return state.core.groups },
	getMyGroupNames: (state) => { return _.map(_.filter(selectors.getGroups(state), 'isMine'), 'name') },
	getUIState: (state) => { return state.ui },
	getSidebarIsExpanded: (state, name) => {
		const expandedItems = _.get(state.ui, [ 'sidebar', 'expanded' ], [])
		return _.includes(expandedItems, name)
	},
	getLensState: (state, lensSlug, cardId) => {
		return _.get(state.ui, [ 'lensState', lensSlug, cardId ], {})
	},
	getViewNotices: (state) => { return state.core.viewNotices },
	getUsersTypingOnCard: (state, card) => {
		return _.keys(_.get(state.core, [ 'usersTyping', card ], {}))
	},

	// View specific selectors
	getViewData: (state, query, options = {}) => {
		const tail = state.views.viewData[options.viewId || getViewId(query)]
		return tail || null
	},
	getSubscription: (state, id) => {
		return state.views.subscriptions[id] || null
	},
	getSubscriptions: (state) => {
		return state.views.subscriptions || {}
	},
	getStarredViews: (state) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'starredViews' ], [])
	},
	getUsersViewLens: (state, viewId) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'viewSettings', viewId, 'lens' ], null)
	},
	getHomeView: (state) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'homeView' ], null)
	},
	getInboxQuery: (state) => {
		const user = selectors.getCurrentUser(state)
		const groupNames = selectors.getMyGroupNames(state)
		return getUnreadQuery(user, groupNames)
	},
	getInboxViewData: (state) => {
		const query = selectors.getInboxQuery(state)
		const options = {
			viewId: 'inbox-unread'
		}
		return selectors.getViewData(state, query, options)
	}
}

const streams = {}

let commsStream = null

export default class ActionCreator {
	constructor (context) {
		this.sdk = context.sdk
		this.errorReporter = context.errorReporter
		this.analytics = context.analytics
		this.tokenRefreshInterval = null

		this.bindMethods([
			'addChannel',
			'addSubscription',
			'addViewNotice',
			'addUser',
			'appendViewData',
			'authorizeIntegration',
			'bootstrap',
			'clearViewData',
			'completeFirstTimeLogin',
			'completePasswordReset',
			'createLink',
			'dumpState',
			'getIntegrationAuthUrl',
			'getActor',
			'getCard',
			'getCardWithLinks',
			'getLinks',
			'getStream',
			'loadChannelData',
			'loadMoreChannelData',
			'loadViewData',
			'loadMoreViewData',
			'login',
			'loginWithToken',
			'logout',
			'paginateStream',
			'queryAPI',
			'removeChannel',
			'removeFlow',
			'removeView',
			'removeViewDataItem',
			'removeViewNotice',
			'requestPasswordReset',
			'sendFirstTimeLoginLink',
			'setAuthToken',
			'setChannels',
			'setChatWidgetOpen',
			'setDefault',
			'setFlow',
			'setOrgs',
			'setPassword',
			'setSendCommand',
			'setStatus',
			'setTimelineMessage',
			'setTypes',
			'setupStream',
			'setGroups',
			'setSidebarExpanded',
			'setLensState',
			'setUser',
			'setViewData',
			'setViewLens',
			'setViewStarred',
			'signalTyping',
			'signup',
			'updateChannel',
			'updateUser',
			'upsertViewData'
		])

		// Card exists here until it's loaded
		const loadingCardCache = {}

		// This is a function that memoizes a debounce function, this allows us to
		// create different debounce lists depending on the args passed to
		// 'getCard'
		this.getCardInternal = (id, type, linkVerbs = []) => {
			return async (dispatch, getState) => {
				if (!id) {
					return null
				}
				let card = selectors.getCard(id, type)(getState())

				// Check if the cached card has all the links required by this request
				const isCached = card && _.every(linkVerbs, (linkVerb) => {
					return Boolean(_.get(card, [ 'links' ], {})[linkVerb])
				})

				if (!isCached) {
					// API requests are debounced based on the unique combination of the card ID and the (sorted) link verbs
					const linkVerbSlugs = _.orderBy(linkVerbs)
						.map((verb) => { return helpers.slugify(verb) })
					const loadingCacheKey = [ id ].concat(linkVerbSlugs).join('_')
					if (!Reflect.has(loadingCardCache, loadingCacheKey)) {
						const schema = {
							type: 'object',
							properties: {
								id: {
									const: id
								}
							},
							additionalProperties: true
						}

						if (linkVerbs.length) {
							schema.$$links = {}
							for (const linkVerb of linkVerbs) {
								schema.$$links[linkVerb] = {
									type: 'object',
									additionalProperties: true
								}
							}
						}

						loadingCardCache[loadingCacheKey] = this.sdk.query(
							schema,
							{
								limit: 1
							}
						).then((result) => {
							if (result.length) {
								return result[0]
							}

							// If there was a card returned from the cache originally, just
							// return that one instead of making another request
							if (card) {
								return card
							}

							return this.sdk.card.get(id)
						}).then((element) => {
							// If a card doesn't have matching links, but a request was made
							// for them, indicate this with an empty array, so the cache entry
							// isn't ignored unnecessarily
							if (element && linkVerbs.length) {
								for (const linkVerb of linkVerbs) {
									if (!element.links[linkVerb]) {
										element.links[linkVerb] = []
									}
								}
							}

							return element
						}).finally(() => {
							Reflect.deleteProperty(loadingCardCache, loadingCacheKey)
						})
					}

					card = await loadingCardCache[loadingCacheKey]

					if (card) {
						dispatch({
							type: actions.SET_CARD,
							value: card
						})
					}
				}
				return card || null
			}
		}
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	getIntegrationAuthUrl (user, integration) {
		return async () => {
			return this.sdk.integrations.getAuthorizationUrl(user, integration)
		}
	}

	getCard (cardId, cardType, linkVerbs) {
		return async (dispatch, getState) => {
			return this.getCardInternal(cardId, cardType, linkVerbs)(dispatch, getState)
		}
	}

	getActor (id) {
		return async (dispatch, getState) => {
			const card = await this.getCardInternal(id, 'user', [ 'is member of' ])(dispatch, getState)
			return helpers.generateActorFromUserCard(card)
		}
	}

	async getCardWithLinks (schema, card) {
		// The updated card may not have attached links, so get them now
		if (schema.$$links) {
			return _.first(await this.sdk.query({
				$$links: schema.$$links,
				description: `Get card with links ${card.id}`,
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: card.id
					}
				},
				required: [ 'id' ],
				additionalProperties: true
			}, {
				limit: 1
			}))
		}

		return card
	}

	setStatus (status) {
		// If the status is now 'unauthorized' just run the logout routine
		if (status === 'unauthorized') {
			this.sdk.auth.logout()
			return {
				type: actions.LOGOUT
			}
		}
		return {
			type: actions.SET_STATUS,
			value: status
		}
	}

	setSidebarExpanded (name, isExpanded) {
		return (dispatch, getState) => {
			const uiState = selectors.getUIState(getState())
			const newExpandedItems = isExpanded
				? uiState.sidebar.expanded.concat([ name ])
				: _.without(uiState.sidebar.expanded, name)
			return dispatch({
				type: actions.SET_UI_STATE,
				value: immutableUpdate(uiState, {
					sidebar: {
						expanded: {
							$set: newExpandedItems
						}
					}
				})
			})
		}
	}

	setLensState (lens, cardId, state) {
		return {
			type: actions.SET_LENS_STATE,
			value: {
				lens,
				cardId,
				state
			}
		}
	}

	getLinks (card, verb) {
		if (!_.some(this.sdk.LINKS, {
			name: verb
		})) {
			throw new Error(`No link definition found for ${card.type} using ${verb}`)
		}

		return async () => {
			const results = await this.sdk.query({
				$$links: {
					[verb]: {
						type: 'object'
					}
				},
				description: `Get card with links ${card.id}`,
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: card.id
					},
					links: {
						type: 'object'
					}
				},
				required: [ 'id' ]
			}, {
				limit: 1
			})

			if (results.length) {
				return results[0].links[verb]
			}

			return []
		}
	}

	loadChannelData (channel) {
		return async (dispatch, getState) => {
			if (channel.data.canonical === false) {
				return
			}
			const {
				target
			} = channel.data

			const identifier = isUUID(target) ? 'id' : 'slug'

			let query = {
				type: 'object',
				properties: {
					[identifier]: {
						type: 'string',
						const: target
					}
				},
				$$links: {
					'has attached element': {
						type: 'object'
					}
				},
				required: [ identifier ]
			}

			// TODO: Clean up when we have optional links
			// OR make sure default cards have attached items
			// Checks to see if we can query for the card with
			// attached elements. If we can't, remove the
			// $$links from the query
			let cards = await this.sdk.query(query)

			if (cards.length === 0) {
				query = _.omit(query, [ '$$links' ])
				cards = [ await this.sdk.card.get(target) ]
			}

			const [ card ] = cards
			if (_.isNil(card)) {
				throw new Error(`Could not find card with ${identifier} target`)
			}

			const stream = await this.getStream(cards[0].id, query)

			stream.on('dataset', ({
				data: {
					cards: channels
				}
			}) => {
				const currentChannel = _.find(selectors.getChannels(getState()), {
					id: channel.id
				})

				const clonedChannel = clone(currentChannel)

				if (channels.length > 0) {
					// Merge required in the event that this is a pagination query
					clonedChannel.data.head = merge(clonedChannel.data.head, channels[0])
				}

				dispatch({
					type: actions.UPDATE_CHANNEL,
					value: clonedChannel
				})
			})

			stream.on('update', ({
				data: {
					after: newHead
				}
			}) => {
				const currentChannel = _.find(selectors.getChannels(getState()), {
					id: channel.id
				})
				if (!currentChannel) {
					return null
				}
				const clonedChannel = clone(currentChannel)

				// Don't bother is the channel head card hasn't changed
				if (newHead && fastEquals.deepEqual(clonedChannel.data.head, newHead)) {
					return null
				}

				// If head is null, this indicates a 404 not found error
				clonedChannel.data.head = newHead
				return dispatch({
					type: actions.UPDATE_CHANNEL,
					value: clonedChannel
				})
			})

			stream.emit('queryDataset', {
				data: {
					schema: query,
					options: {
						links: {
							'has attached element': {
								limit: 20,
								sortBy: 'created_at',
								sortDir: 'desc'
							}
						}
					}
				}
			})
		}
	}

	loadMoreChannelData ({
		target, query, queryOptions
	}) {
		return async (dispatch, getState) => {
			const identifierType = isUUID(target) ? 'id' : 'slug'
			let cardIdentifier = target

			if (identifierType !== 'id') {
				const card = await this.sdk.card.get(target)
				if (_.isNil(card)) {
					throw new Error(`Could not find card with ${identifierType} ${target}`)
				}
				cardIdentifier = card.id
			}

			const stream = streams[cardIdentifier]
			if (!stream) {
				throw new Error('Stream not found: Did you forget to call loadChannelData?')
			}
			const queryId = uuid()
			stream.emit('queryDataset', {
				data: {
					id: queryId,
					schema: query,
					options: queryOptions
				}
			})
			return new Promise((resolve, reject) => {
				const handler = ({
					data
				}) => {
					if (data.id === queryId) {
						resolve(data.cards)
						stream.off('dataset', handler)
					}
				}
				stream.on('dataset', handler)
			})
		}
	}

	updateChannel (channel) {
		return {
			type: actions.UPDATE_CHANNEL,
			value: channel
		}
	}

	addChannel (data = {}) {
		if (!data.cardType && data.canonical !== false) {
			console.error('Channel added without a card type', data)
		}
		const channel = createChannel(data)

		return (dispatch) => {
			dispatch({
				type: actions.ADD_CHANNEL,
				value: channel
			})
			return dispatch(this.loadChannelData(channel))
		}
	}

	removeChannel (channel) {
		// Shutdown any streams that are open for this channel
		if (channel.data.canonical !== false) {
			const {
				target
			} = channel.data
			const hash = hashCode(target)

			if (streams[hash]) {
				streams[hash].close()
				Reflect.deleteProperty(streams, hash)
			}
		}

		return {
			type: actions.REMOVE_CHANNEL,
			value: channel
		}
	}

	setChannels (channelData = []) {
		const channels = _.map(channelData, (channel) => {
			// If the channel has an ID its already been instantiated
			if (channel.id) {
				return channel
			}

			// Otherwise we're just dealing with the `data` value and need to create
			// a full channel card
			return createChannel(channel)
		})

		return (dispatch) => {
			dispatch({
				type: actions.SET_CHANNELS,
				value: channels
			})

			// For each channel, if data is not already loaded, load it now
			for (const channel of channels) {
				if (!channel.data.head) {
					dispatch(this.loadChannelData(channel))
				}
			}
		}
	}

	setChatWidgetOpen (open) {
		return (dispatch, getState) => {
			const uiState = getState().ui

			dispatch({
				type: actions.SET_UI_STATE,
				value: {
					...uiState,
					chatWidget: {
						open
					}
				}
			})
		}
	}

	bootstrap () {
		return (dispatch, getState) => {
			return Bluebird.props({
				user: this.sdk.auth.whoami(),
				orgs: this.sdk.card.getAllByType('org'),
				types: this.sdk.card.getAllByType('type'),
				groups: this.sdk.query(allGroupsWithUsersQuery),
				config: this.sdk.getConfig()
			})
				.then(async ({
					user, types, groups, orgs, config
				}) => {
					if (!user) {
						throw new Error('Could not retrieve user')
					}
					const state = getState()

					// Check to see if we're still logged in
					if (selectors.getSessionToken(state)) {
						dispatch(this.setUser(user))
						dispatch(this.setTypes(types))
						dispatch(this.setOrgs(orgs))
						dispatch(this.setGroups(groups, user))
						dispatch({
							type: actions.SET_CONFIG,
							value: config
						})
						const channels = selectors.getChannels(state)
						channels.forEach((channel) => {
							return dispatch(this.loadChannelData(channel))
						})
					}

					this.errorReporter.setUser({
						id: user.id,
						slug: user.slug,
						email: _.get(user, [ 'data', 'email' ])
					})

					this.tokenRefreshInterval = setInterval(async () => {
						const newToken = await this.sdk.auth.refreshToken()
						dispatch(this.setAuthToken(newToken))
					}, TOKEN_REFRESH_INTERVAL)

					if (commsStream) {
						commsStream.close()
					}

					// Open a stream for messages, whispers and uses. This allows us to
					// listen for message edits, sync status, alerts/pings and changes in
					// other users statuses
					commsStream = await this.sdk.stream({
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: [
									'message@1.0.0',
									'whisper@1.0.0',
									'summary@1.0.0',
									'user@1.0.0'
								]
							}
						},
						required: [ 'type' ]
					})

					commsStream.on('update', (payload) => streamUpdate(payload, getState, dispatch, user, types))

					// TODO handle typing notifications in a more generic way, this is an
					// abomination. (A small abomination, but still an abomination)
					commsStream.on('typing', (payload) => streamTyping(dispatch, payload))

					commsStream.on('error', (error) => {
						console.error('A stream error occurred', error)
					})

					// Load unread message pings
					const groupNames = selectors.getMyGroupNames(getState())
					const unreadQuery = getUnreadQuery(user, groupNames)

					this.loadViewData(unreadQuery, {
						viewId: 'inbox-unread'
					})(dispatch, getState)

					return user
				})
		}
	}

	setAuthToken (token) {
		return {
			type: actions.SET_AUTHTOKEN,
			value: token
		}
	}

	loginWithToken (token) {
		return (dispatch, getState) => {
			return this.sdk.auth.loginWithToken(token)
				.then(() => { return dispatch(this.setAuthToken(token)) })
				.then(() => { return dispatch(this.bootstrap()) })
				.then(() => { return dispatch(this.setStatus('authorized')) })
				.then(() => {
					this.analytics.track('ui.loginWithToken')
					this.analytics.identify(selectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(this.setStatus('unauthorized'))
					throw error
				})
		}
	}

	login (payload) {
		return (dispatch, getState) => {
			return this.sdk.auth.login(payload)
				.then((session) => { return dispatch(this.setAuthToken(session.id)) })
				.then(() => { return dispatch(this.bootstrap()) })
				.then(() => { return dispatch(this.setStatus('authorized')) })
				.then(() => {
					this.analytics.track('ui.login')
					this.analytics.identify(selectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(this.setStatus('unauthorized'))
					throw error
				})
		}
	}

	logout () {
		if (this.tokenRefreshInterval) {
			clearInterval(this.tokenRefreshInterval)
		}

		this.analytics.track('ui.logout')
		this.analytics.identify()
		this.errorReporter.setUser(null)
		if (commsStream) {
			commsStream.close()
			commsStream = null
			this.sdk.auth.logout()
		}
		_.forEach(streams, (stream, id) => {
			stream.close()
			Reflect.deleteProperty(streams, id)
		})
		return {
			type: actions.LOGOUT
		}
	}

	signup (payload) {
		return (dispatch) => {
			return this.sdk.auth.signup(payload)
				.then(() => {
					this.analytics.track('ui.signup')
					dispatch(this.login(payload))
				})
		}
	}

	queryAPI (expression, options) {
		return () => {
			return this.sdk.query(expression, options)
		}
	}

	setUser (user) {
		return {
			type: actions.SET_USER,
			value: user
		}
	}

	setTimelineMessage (target, message) {
		return (dispatch) => {
			dispatch({
				type: actions.SET_TIMELINE_MESSAGE,
				value: {
					target,
					message
				}
			})
		}
	}

	setTypes (types) {
		return {
			type: actions.SET_TYPES,
			value: types
		}
	}

	setGroups (groups, user) {
		return {
			type: actions.SET_GROUPS,
			value: {
				groups,
				userSlug: user.slug
			}
		}
	}

	setOrgs (orgs) {
		return {
			type: actions.SET_ORGS,
			value: orgs
		}
	}

	removeView (view) {
		return async (dispatch, getState) => {
			try {
				const user = selectors.getCurrentUser(getState())
				if (!helpers.isCustomView(view, user.slug)) {
					addNotification('danger', 'You do not have permission to delete this view')
					return
				}

				// First remove any matching view channels - if found
				const state = getState()
				const matchingChannels = _.filter(state.core.channels, (channel) => {
					return _.get(channel, [ 'data', 'target' ]) === view.slug
				})
				if (matchingChannels.length) {
					const removeChannelActions = _.map(matchingChannels, (channel) => {
						return dispatch(this.removeChannel(channel))
					})
					await Bluebird.all(removeChannelActions)
				}

				// Then remove the card via the SDK
				await this.sdk.card.remove(view.id, view.type)

				addNotification('success', 'Successfully deleted view')
			} catch (err) {
				console.error('Failed to remove view', err)
				addNotification('danger', 'Could not remove view')
			}
		}
	}

	addViewNotice (payload) {
		return {
			type: actions.ADD_VIEW_NOTICE,
			value: payload
		}
	}

	removeViewNotice (id) {
		return {
			type: actions.REMOVE_VIEW_NOTICE,
			value: id
		}
	}

	updateUser (patches, successNotification) {
		return async (dispatch, getState) => {
			try {
				const user = selectors.getCurrentUser(getState())

				await this.sdk.card.update(user.id, 'user', patches)

				const updatedUser = await this.sdk.getById(user.id)

				dispatch(this.setUser(updatedUser))
				if (successNotification !== null) {
					addNotification('success', successNotification || 'Successfully updated user')
				}
			} catch (error) {
				addNotification('danger', error.message || error)
			}
		}
	}

	addUser ({
		username,
		email,
		org
	}) {
		return async (dispatch, getState) => {
			try {
				const user = await this.sdk.auth.signup({
					username,
					email,
					password: ''
				})
				await dispatch(this.createLink(org, user, 'has member'))
				const loginLinkSent = await dispatch(this.sendFirstTimeLoginLink({
					user
				}))
				if (loginLinkSent) {
					addNotification('success', 'Successfully created user')
					return true
				}
				return false
			} catch (error) {
				addNotification('danger', error.message)
				return false
			}
		}
	}

	sendFirstTimeLoginLink ({
		user
	}) {
		return async (dispatch, getState) => {
			try {
				await this.sdk.action({
					card: user.id,
					action: 'action-send-first-time-login-link@1.0.0',
					type: user.type,
					arguments: {}
				})
				addNotification('success', 'Sent first-time login token to user')
				return true
			} catch (error) {
				addNotification('danger', error.message)
				return false
			}
		}
	}

	requestPasswordReset ({
		username
	}) {
		return async (dispatch, getState) => {
			const userType = await this.sdk.getBySlug('user@latest')
			return this.sdk.action({
				card: userType.id,
				action: 'action-request-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					username
				}
			})
		}
	}

	completePasswordReset ({
		password,
		resetToken
	}) {
		return async (dispatch, getState) => {
			const userType = await this.sdk.getBySlug('user@latest')
			return this.sdk.action({
				card: userType.id,
				action: 'action-complete-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					newPassword: password,
					resetToken
				}
			})
		}
	}

	completeFirstTimeLogin ({
		password,
		firstTimeLoginToken
	}) {
		return async (dispatch, getState) => {
			const userType = await this.sdk.getBySlug('user@latest')
			return this.sdk.action({
				card: userType.id,
				action: 'action-complete-first-time-login@1.0.0',
				type: userType.type,
				arguments: {
					newPassword: password,
					firstTimeLoginToken
				}
			})
		}
	}

	setPassword (currentPassword, newPassword) {
		return async (dispatch, getState) => {
			try {
				const user = selectors.getCurrentUser(getState())
				await this.sdk.action({
					card: user.id,
					action: 'action-set-password@1.0.0',
					type: user.type,
					arguments: {
						currentPassword,
						newPassword
					}
				})

				addNotification('success', 'Successfully changed password')
			} catch (error) {
				addNotification('danger', error.message || error)
			}
		}
	}

	setSendCommand (command) {
		return async (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			const patches = helpers.patchPath(
				user,
				[ 'data', 'profile', 'sendCommand' ],
				command
			)

			return this.updateUser(patches, `Successfully set "${command}" as send command`)(dispatch, getState)
		}
	}

	clearViewData (query, options = {}) {
		const id = options.viewId || getViewId(query)
		if (streams[id]) {
			streams[id].close()
			Reflect.deleteProperty(streams, id)
		}
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data: null
			}
		}
	}

	createLink (fromCard, toCard, verb, options = {}) {
		return async (dispatch) => {
			try {
				await this.sdk.card.link(fromCard, toCard, verb)
				this.analytics.track('element.create', {
					element: {
						type: 'link'
					}
				})
				if (!options.skipSuccessMessage) {
					addNotification('success', 'Created new link')
				}
			} catch (error) {
				addNotification('danger', error.message)
			}
		}
	}

	dumpState () {
		return async (dispatch, getState) => {
			const state = clone(getState())
			_.set(state, [ 'core', 'session', 'authToken' ], '[REDACTED]')
			_.set(state, [ 'core', 'session', 'user', 'data', 'hash' ], '[REDACTED]')

			return state
		}
	}

	getStream (streamId, query) {
		if (streams[streamId]) {
			streams[streamId].close()
			Reflect.deleteProperty(streams, streamId)
		}

		return this.sdk.stream(query).then((stream) => {
			streams[streamId] = stream
			return stream
		})
	}

	setupStream (streamId, query, options, handlers) {
		return async (dispatch, getState) => {
			const stream = await this.getStream(streamId, query)

			stream.on(
				'update',
				/* eslint-disable consistent-return */
				(response) => {
					// Use the async dispatch queue here, as we want to ensure that
					// each update causes a store update one at a time, to prevent
					// race conditions. For example, removing a data item happens
					// quicker then adding a data item as we don't need to load links
					asyncDispatchQueue.enqueue((async () => {
						const {
							type,
							id: cardId,
							after: card
						} = response.data

						// If card is null then it has been set to inactive or deleted
						if (card === null) {
							return handlers.remove(cardId)
						}

						// If the type is insert, it is a new item
						if (type === 'insert') {
							return handlers.append(card)
						}

						// All other updates are an upsert
						return handlers.upsert(card)
					})(), dispatch)
				}
			)

			stream.emit('queryDataset', {
				id: uuid(),
				data: {
					schema: query,
					options: {
						limit: options.limit,
						skip: options.limit * options.page,
						sortBy: options.sortBy,
						sortDir: options.sortDir
					}
				}
			})

			const [ {
				data: {
					cards
				}
			} ] = await once(stream, 'dataset')
			await handlers.set(cards)
			return cards
		}
	}

	paginateStream (viewId, query, options, appendHandler) {
		return async (dispatch, getState) => {
			const stream = streams[viewId]
			if (!stream) {
				throw new Error('Stream not found: Did you forget to call loadViewData?')
			}
			const queryId = uuid()

			const queryOptions = {
				limit: options.limit,
				skip: options.limit * options.page,
				sortBy: options.sortBy,
				sortDir: options.sortDir
			}

			stream.emit('queryDataset', {
				data: {
					id: queryId,
					schema: query,
					options: queryOptions
				}
			})
			return new Promise((resolve, reject) => {
				const handler = ({
					data: {
						id,
						cards
					}
				}) => {
					if (id === queryId) {
						appendHandler(cards)
						resolve(cards)
						stream.off('dataset', handler)
					}
				}
				stream.on('dataset', handler)
			})
		}
	}

	loadViewData (query, options = {}) {
		return async (dispatch, getState) => {
			const commonOptions = _.pick(options, 'viewId')
			const user = selectors.getCurrentUser(getState())
			const viewId = options.viewId || getViewId(query)

			const rawSchema = await loadSchema(this.sdk, query, user)
			if (!rawSchema) {
				return
			}

			const schema = options.mask ? options.mask(clone(rawSchema)) : rawSchema
			schema.description = schema.description || 'View action creators'

			const streamHandlers = {
				remove: (cardId) => this.removeViewDataItem(query, cardId, commonOptions),
				append: (card) => this.appendViewData(query, card, commonOptions),
				upsert: (card) => this.upsertViewData(query, card, commonOptions),
				set: (cards) => dispatch(this.setViewData(query, cards, commonOptions))
			}

			return this.setupStream(viewId, schema, options, streamHandlers)(dispatch, getState)
		}
	}

	loadMoreViewData (query, options) {
		return async (dispatch, getState) => {
			const commonOptions = _.pick(options, 'viewId')
			const appendHandler = (card) => dispatch(this.appendViewData(query, card, commonOptions))
			const viewId = options.viewId || getViewId(query)
			return this.paginateStream(viewId, query, options, appendHandler)(dispatch, getState)
		}
	}

	setDefault (card) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			const patch = helpers.patchPath(
				user,
				[ 'data', 'profile', 'homeView' ],
				// eslint-disable-next-line no-undefined
				_.get(card, [ 'id' ], undefined)
			)

			const successNotification = card
				? `Set ${card.name || card.slug} as default view`
				: 'Removed default view'

			return this.updateUser(patch, successNotification)(dispatch, getState)
		}
	}

	setViewLens (viewId, lensSlug) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			const patches = helpers.patchPath(
				user,
				[ 'data', 'profile', 'viewSettings', viewId, 'lens' ],
				lensSlug
			)

			return this.updateUser(patches, null)(dispatch, getState)
		}
	}

	setViewStarred (view, isStarred) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())
			const existingStarredViews = _.get(user, [ 'data', 'profile', 'starredViews' ], [])
			const newStarredViews = isStarred
				? _.uniq(existingStarredViews.concat(view.slug))
				: _.without(existingStarredViews, view.slug)
			const patch = helpers.patchPath(
				user,
				[ 'data', 'profile', 'starredViews' ],
				newStarredViews
			)

			return this.updateUser(
				patch,
				`${isStarred ? 'Starred' : 'Un-starred'} view '${view.name || view.slug}'`
			)(dispatch, getState)
		}
	}

	signalTyping (card) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			commsStream.type(user.slug, card)
		}
	}

	removeViewDataItem (query, itemId, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id,
				itemId
			}
		}
	}

	setViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data
			}
		}
	}

	upsertViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	}

	appendViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)

		return {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	}

	authorizeIntegration (user, integration, code) {
		return async (dispatch) => {
			await this.sdk.integrations.authorize(user, integration, code)

			const updatedUser = await this.sdk.auth.whoami()

			dispatch(this.setUser(updatedUser))
		}
	}

	addSubscription (target) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())
			if (!user) {
				throw new Error('Can\'t load a subscription without an active user')
			}
			this.sdk.query({
				type: 'object',
				description: `Get subscription ${user.id} / ${target}`,
				properties: {
					type: {
						const: 'subscription@1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							target: {
								const: target
							},
							actor: {
								const: user.id
							}
						},
						additionalProperties: true
					}
				},
				additionalProperties: true
			})
				.then((results) => {
					// Check to see if the user is still logged in
					if (!selectors.getSessionToken(getState())) {
						return
					}
					Bluebird.try(() => {
						const subCard = _.first(results) || null
						if (!subCard) {
							return this.sdk.card.create({
								type: 'subscription',
								data: {
									target,
									actor: user.id
								}
							})
								.tap(() => {
									this.analytics.track('element.create', {
										element: {
											type: 'subscription'
										}
									})
								})
						}
						return subCard
					})
						.tap((subCard) => {
							dispatch({
								type: actions.SAVE_SUBSCRIPTION,
								value: {
									data: subCard,
									id: target
								}
							})
						})
				})
				.catch((error) => {
					addNotification('danger', error.message)
				})
		}
	}

	setFlow (flowId, cardId, flowState) {
		return (dispatch) => {
			return dispatch({
				type: actions.SET_FLOW,
				value: {
					flowId,
					cardId,
					flowState
				}
			})
		}
	}

	removeFlow (flowId, cardId) {
		return (dispatch) => {
			return dispatch({
				type: actions.REMOVE_FLOW,
				value: {
					flowId,
					cardId
				}
			})
		}
	}
}
