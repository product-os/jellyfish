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
import {
	getAllLinkQueries
} from '../helpers'

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
			required: [ 'slug', 'active' ],
			properties: {
				active: {
					type: 'boolean',
					const: true
				},
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

const getStreamQuery = (channel) => {
	const {
		target
	} = channel.data

	const identifier = isUUID(target) ? 'id' : 'slug'

	// Note: 'has attached element' will load the timeline cards and should be
	// paginated when the stream is setup
	let default$$Links = {
		'has attached element': {
			type: 'object',
			additionalProperties: true
		}
	}

	// If we have a channel that's not a view
	if (_.get(channel, [ 'data', 'cardType' ]) !== 'view') {
		// Go through all the link constraints and
		// add all possible links to the default $$Links
		default$$Links = {
			...default$$Links,
			...getAllLinkQueries()
		}
	}

	return {
		type: 'object',
		anyOf: [
			{
				$$links: {
					...default$$Links
				}
			},
			true
		],
		properties: {
			[identifier]: {
				type: 'string',
				const: target
			}
		}
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
		return selectors.getViewData(state, query)
	}
}

// TODO: Fix these side effects
const streams = {}

let commsStream = null
let tokenRefreshInterval = null

// Card exists here until it's loaded
const loadingCardCache = {}

// This is a function that memoizes a debounce function, this allows us to
// create different debounce lists depending on the args passed to
// 'getCard'
const getCardInternal = (id, type, linkVerbs = []) => {
	return async (dispatch, getState, {
		sdk
	}) => {
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

				loadingCardCache[loadingCacheKey] = sdk.query(
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

					return sdk.card.get(id)
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

export const actionCreators = {
	getIntegrationAuthUrl (user, integration) {
		return async (dispatch, getState, {
			sdk
		}) => {
			return sdk.integrations.getAuthorizationUrl(user, integration)
		}
	},

	getCard (cardId, cardType, linkVerbs) {
		return async (dispatch, getState, context) => {
			return getCardInternal(cardId, cardType, linkVerbs)(dispatch, getState, context)
		}
	},

	getActor (id) {
		return async (dispatch, getState, context) => {
			const card = await getCardInternal(id, 'user', [ 'is member of' ])(dispatch, getState, context)
			return helpers.generateActorFromUserCard(card)
		}
	},

	setStatus (status) {
		return (dispatch, getState, {
			sdk
		}) => {
			// If the status is now 'unauthorized' just run the logout routine
			if (status === 'unauthorized') {
				sdk.auth.logout()
				dispatch({
					type: actions.LOGOUT
				})
			} else {
				dispatch({
					type: actions.SET_STATUS,
					value: status
				})
			}
		}
	},

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
	},

	setLensState (lens, cardId, state) {
		return {
			type: actions.SET_LENS_STATE,
			value: {
				lens,
				cardId,
				state
			}
		}
	},

	// TODO: This is NOT an action creator, it should be part of sdk or other helper
	getLinks ({
		sdk
	}, card, verb) {
		if (!_.some(sdk.LINKS, {
			name: verb
		})) {
			throw new Error(`No link definition found for ${card.type} using ${verb}`)
		}

		return async () => {
			const results = await sdk.query({
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
	},

	loadChannelData (channel) {
		return async (dispatch, getState, {
			sdk
		}) => {
			if (channel.data.canonical === false) {
				return
			}
			const {
				target
			} = channel.data

			const query = getStreamQuery(channel)

			const stream = await actionCreators.getStream({
				sdk
			}, target, query)

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
					clonedChannel.data.head = merge(
						clonedChannel.data.head,
						channels[0],
						{
							arrayMerge: (destinationArray, sourceArray) => {
								return _.union(destinationArray, sourceArray)
							}
						}
					)
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
	},

	loadMoreChannelData ({
		target, query, queryOptions
	}) {
		return async (dispatch, getState) => {
			// The target value can be a slug or id. We can find the corresponding
			// full card from the stored channel data and then use that to find the
			// cached stream reference.
			// TODO: normalize channel loading to use the card ID
			const idGetter = (channel) => _.get(channel, [ 'data', 'head', 'id' ])
			const slugGetter = (channel) => _.get(channel, [ 'data', 'head', 'slug' ])
			const targetChannel = _.find(selectors.getChannels(getState()), (channel) => {
				return idGetter(channel) === target || slugGetter(channel) === target
			})
			const targetSlug = slugGetter(targetChannel)
			const targetId = idGetter(targetChannel)

			const stream = streams[targetSlug] || streams[targetId]

			if (!stream) {
				throw new Error('Stream not found: Did you forget to call loadChannelData?')
			}
			const queryId = uuid()
			stream.emit('queryDataset', {
				data: {
					id: queryId,
					schema: getStreamQuery(targetChannel),
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
	},

	updateChannel (channel) {
		return {
			type: actions.UPDATE_CHANNEL,
			value: channel
		}
	},

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
			return dispatch(actionCreators.loadChannelData(channel))
		}
	},

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
	},

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
					dispatch(actionCreators.loadChannelData(channel))
				}
			}
		}
	},

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
	},

	bootstrap () {
		return (dispatch, getState, {
			sdk, errorReporter
		}) => {
			return Bluebird.props({
				user: sdk.auth.whoami(),
				orgs: sdk.card.getAllByType('org'),
				types: sdk.card.getAllByType('type'),
				groups: sdk.query(allGroupsWithUsersQuery),
				config: sdk.getConfig()
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
						dispatch(actionCreators.setUser(user))
						dispatch(actionCreators.setTypes(types))
						dispatch(actionCreators.setOrgs(orgs))
						dispatch(actionCreators.setGroups(groups, user))
						dispatch({
							type: actions.SET_CONFIG,
							value: config
						})
						const channels = selectors.getChannels(state)
						channels.forEach((channel) => {
							return dispatch(actionCreators.loadChannelData(channel))
						})
					}

					errorReporter.setUser({
						id: user.id,
						slug: user.slug,
						email: _.get(user, [ 'data', 'email' ])
					})

					tokenRefreshInterval = setInterval(async () => {
						const newToken = await sdk.auth.refreshToken()
						dispatch(actionCreators.setAuthToken(newToken))
					}, TOKEN_REFRESH_INTERVAL)

					if (commsStream) {
						commsStream.close()
					}

					// Open a stream for messages, whispers and uses. This allows us to
					// listen for message edits, sync status, alerts/pings and changes in
					// other users statuses
					commsStream = await sdk.stream({
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: [
									'message@1.0.0',
									'whisper@1.0.0',
									'summary@1.0.0',
									'rating@1.0.0',
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

					dispatch(actionCreators.loadViewData(unreadQuery))

					return user
				})
		}
	},

	setAuthToken (token) {
		return {
			type: actions.SET_AUTHTOKEN,
			value: token
		}
	},

	loginWithToken (token) {
		return (dispatch, getState, {
			sdk, analytics
		}) => {
			return sdk.auth.loginWithToken(token)
				.then(() => { return dispatch(actionCreators.setAuthToken(token)) })
				.then(() => { return dispatch(actionCreators.bootstrap()) })
				.then(() => { return dispatch(actionCreators.setStatus('authorized')) })
				.then(() => {
					analytics.track('ui.loginWithToken')
					analytics.identify(selectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'))
					throw error
				})
		}
	},

	login (payload) {
		return (dispatch, getState, {
			sdk, analytics
		}) => {
			return sdk.auth.login(payload)
				.then((session) => { return dispatch(actionCreators.setAuthToken(session.id)) })
				.then(() => { return dispatch(actionCreators.bootstrap()) })
				.then(() => { return dispatch(actionCreators.setStatus('authorized')) })
				.then(() => {
					analytics.track('ui.login')
					analytics.identify(selectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'))
					throw error
				})
		}
	},

	logout () {
		return (dispatch, getState, {
			sdk, analytics, errorReporter
		}) => {
			if (tokenRefreshInterval) {
				clearInterval(tokenRefreshInterval)
			}

			analytics.track('ui.logout')
			analytics.identify()
			errorReporter.setUser(null)
			if (commsStream) {
				commsStream.close()
				commsStream = null
				sdk.auth.logout()
			}
			_.forEach(streams, (stream, id) => {
				stream.close()
				Reflect.deleteProperty(streams, id)
			})
			dispatch({
				type: actions.LOGOUT
			})
		}
	},

	signup (payload) {
		return (dispatch, getState, {
			sdk, analytics
		}) => {
			return sdk.auth.signup(payload)
				.then(() => {
					analytics.track('ui.signup')
					dispatch(actionCreators.login(payload))
				})
		}
	},

	queryAPI (expression, options) {
		return (dispatch, getState, {
			sdk
		}) => {
			return sdk.query(expression, options)
		}
	},

	setUser (user) {
		return {
			type: actions.SET_USER,
			value: user
		}
	},

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
	},

	setTypes (types) {
		return {
			type: actions.SET_TYPES,
			value: types
		}
	},

	setGroups (groups, user) {
		return {
			type: actions.SET_GROUPS,
			value: {
				groups,
				userSlug: user.slug
			}
		}
	},

	setOrgs (orgs) {
		return {
			type: actions.SET_ORGS,
			value: orgs
		}
	},

	removeView (view) {
		return async (dispatch, getState, {
			sdk
		}) => {
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
						return dispatch(actionCreators.removeChannel(channel))
					})
					await Bluebird.all(removeChannelActions)
				}

				// Then remove the card via the SDK
				await sdk.card.remove(view.id, view.type)

				addNotification('success', 'Successfully deleted view')
			} catch (err) {
				console.error('Failed to remove view', err)
				addNotification('danger', 'Could not remove view')
			}
		}
	},

	addViewNotice (payload) {
		return {
			type: actions.ADD_VIEW_NOTICE,
			value: payload
		}
	},

	removeViewNotice (id) {
		return {
			type: actions.REMOVE_VIEW_NOTICE,
			value: id
		}
	},

	updateUser (patches, successNotification) {
		return async (dispatch, getState, {
			sdk
		}) => {
			try {
				const user = selectors.getCurrentUser(getState())

				await sdk.card.update(user.id, 'user', patches)

				const updatedUser = await sdk.getById(user.id)

				dispatch(actionCreators.setUser(updatedUser))
				if (successNotification !== null) {
					addNotification('success', successNotification || 'Successfully updated user')
				}
			} catch (error) {
				addNotification('danger', error.message || error)
			}
		}
	},

	addUser ({
		username,
		email,
		org
	}) {
		return async (dispatch, getState, {
			sdk
		}) => {
			try {
				const user = await sdk.auth.signup({
					username,
					email,
					password: ''
				})
				await dispatch(actionCreators.createLink(org, user, 'has member'))
				const loginLinkSent = await dispatch(actionCreators.sendFirstTimeLoginLink({
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
	},

	sendFirstTimeLoginLink ({
		user
	}) {
		return async (dispatch, getState, {
			sdk
		}) => {
			try {
				await sdk.action({
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
	},

	requestPasswordReset ({
		username
	}) {
		return async (dispatch, getState, {
			sdk
		}) => {
			const userType = await sdk.getBySlug('user@latest')
			return sdk.action({
				card: userType.id,
				action: 'action-request-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					username
				}
			})
		}
	},

	completePasswordReset ({
		password,
		resetToken
	}) {
		return async (dispatch, getState, {
			sdk
		}) => {
			const userType = await sdk.getBySlug('user@latest')
			return sdk.action({
				card: userType.id,
				action: 'action-complete-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					newPassword: password,
					resetToken
				}
			})
		}
	},

	completeFirstTimeLogin ({
		password,
		firstTimeLoginToken
	}) {
		return async (dispatch, getState, {
			sdk
		}) => {
			const userType = await sdk.getBySlug('user@latest')
			return sdk.action({
				card: userType.id,
				action: 'action-complete-first-time-login@1.0.0',
				type: userType.type,
				arguments: {
					newPassword: password,
					firstTimeLoginToken
				}
			})
		}
	},

	setPassword (currentPassword, newPassword) {
		return async (dispatch, getState, {
			sdk
		}) => {
			try {
				const user = selectors.getCurrentUser(getState())
				await sdk.action({
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
	},

	setSendCommand (command) {
		return async (dispatch, getState, context) => {
			const user = selectors.getCurrentUser(getState())

			const patches = helpers.patchPath(
				user,
				[ 'data', 'profile', 'sendCommand' ],
				command
			)

			return actionCreators.updateUser(
				patches,
				`Successfully set "${command}" as send command`
			)(dispatch, getState, context)
		}
	},

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
	},

	createLink (fromCard, toCard, verb, options = {}) {
		return async (dispatch, getState, {
			sdk, analytics
		}) => {
			try {
				await sdk.card.link(fromCard, toCard, verb)
				analytics.track('element.create', {
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
	},

	dumpState () {
		return async (dispatch, getState) => {
			const state = clone(getState())
			_.set(state, [ 'core', 'session', 'authToken' ], '[REDACTED]')
			_.set(state, [ 'core', 'session', 'user', 'data', 'hash' ], '[REDACTED]')

			return state
		}
	},

	// TODO: This is NOT an action creator, it should be part of sdk or other helper
	getStream ({
		sdk
	}, streamId, query) {
		if (streams[streamId]) {
			streams[streamId].close()
			Reflect.deleteProperty(streams, streamId)
		}

		return sdk.stream(query).then((stream) => {
			streams[streamId] = stream
			return stream
		})
	},

	setupStream (streamId, query, options, handlers) {
		return async (dispatch, getState, {
			sdk
		}) => {
			const stream = await actionCreators.getStream({
				sdk
			}, streamId, query)

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
	},

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
	},

	loadViewData (query, options = {}) {
		return async (dispatch, getState, context) => {
			const commonOptions = _.pick(options, 'viewId')
			const user = selectors.getCurrentUser(getState())
			const viewId = options.viewId || getViewId(query)

			const rawSchema = await loadSchema(context.sdk, query, user)
			if (!rawSchema) {
				return
			}

			const schema = options.mask ? options.mask(clone(rawSchema)) : rawSchema
			schema.description = schema.description || 'View action creators'

			const streamHandlers = {
				remove: (cardId) => actionCreators.removeViewDataItem(query, cardId, commonOptions),
				append: (card) => actionCreators.appendViewData(query, card, commonOptions),
				upsert: (card) => actionCreators.upsertViewData(query, card, commonOptions),
				set: (cards) => dispatch(actionCreators.setViewData(query, cards, commonOptions))
			}

			return actionCreators.setupStream(viewId, schema, options, streamHandlers)(dispatch, getState, context)
		}
	},

	loadMoreViewData (query, options) {
		return async (dispatch, getState, context) => {
			const commonOptions = _.pick(options, 'viewId')
			const appendHandler = (card) => dispatch(actionCreators.appendViewData(query, card, commonOptions))
			const viewId = options.viewId || getViewId(query)
			return actionCreators.paginateStream(viewId, query, options, appendHandler)(dispatch, getState, context)
		}
	},

	setDefault (card) {
		return (dispatch, getState, context) => {
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

			return actionCreators.updateUser(patch, successNotification)(dispatch, getState, context)
		}
	},

	setViewLens (viewId, lensSlug) {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser(getState())

			const patches = helpers.patchPath(
				user,
				[ 'data', 'profile', 'viewSettings', viewId, 'lens' ],
				lensSlug
			)

			return actionCreators.updateUser(patches, null)(dispatch, getState, context)
		}
	},

	setViewStarred (view, isStarred) {
		return (dispatch, getState, context) => {
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

			return actionCreators.updateUser(
				patch,
				`${isStarred ? 'Starred' : 'Un-starred'} view '${view.name || view.slug}'`
			)(dispatch, getState, context)
		}
	},

	signalTyping (card) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			commsStream.type(user.slug, card)
		}
	},

	removeViewDataItem (query, itemId, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id,
				itemId
			}
		}
	},

	setViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data
			}
		}
	},

	upsertViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)
		return {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	},

	appendViewData (query, data, options = {}) {
		const id = options.viewId || getViewId(query)

		return {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	},

	authorizeIntegration (user, integration, code) {
		return async (dispatch, getState, {
			sdk
		}) => {
			await sdk.integrations.authorize(user, integration, code)

			const updatedUser = await sdk.auth.whoami()

			dispatch(actionCreators.setUser(updatedUser))
		}
	},

	addSubscription (target) {
		return (dispatch, getState, {
			sdk, analytics
		}) => {
			const user = selectors.getCurrentUser(getState())
			if (!user) {
				throw new Error('Can\'t load a subscription without an active user')
			}
			sdk.query({
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
							return sdk.card.create({
								type: 'subscription',
								data: {
									target,
									actor: user.id
								}
							})
								.tap(() => {
									analytics.track('element.create', {
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
	},

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
	},

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
