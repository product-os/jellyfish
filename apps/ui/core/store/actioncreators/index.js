/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

import * as Bluebird from 'bluebird'
import clone from 'deep-copy'
import * as fastEquals from 'fast-equals'
import {
	push
} from 'connected-react-router'
import * as _ from 'lodash'
import * as skhema from 'skhema'
import {
	v4 as uuid
} from 'uuid'
import {
	v4 as isUUID
} from 'is-uuid'
import actions from '../actions'
import * as helpers from '../../../../../lib/ui-components/services/helpers'
import {
	createNotification
} from '../../../services/notifications'
import {
	getQueue
} from '../async-dispatch-queue'
import {
	mentionsUser,
	updateThreadChannels
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
	getNotifications: (state) => { return state.core.notifications || [] },
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
	getUIState: (state) => { return state.ui },
	getLensState: (state, lensSlug, cardId) => {
		return _.get(state.ui, [ 'lensState', lensSlug, cardId ], {})
	},
	getViewNotices: (state) => { return state.core.viewNotices },
	getUsersTypingOnCard: (state, card) => {
		return _.keys(_.get(state.core, [ 'usersTyping', card ], {}))
	},

	// View specific selectors
	getViewData: (state, query) => {
		const tail = state.views.viewData[getViewId(query)]
		return tail ? tail.slice() : null
	},
	getSubscription: (state, id) => {
		return state.views.subscriptions[id] || null
	},
	getSubscriptions: (state) => {
		return state.views.subscriptions || {}
	},
	getUsersViewLens: (state, viewId) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'viewSettings', viewId, 'lens' ], null)
	},
	getHomeView: (state) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'homeView' ], null)
	}
}

const pendingLoadRequests = {}
const streams = {}

const NOTIFICATION_LIFETIME = 7.5 * 1000
const MAX_RETRIES = 4

let commsStream = null

export default class ActionCreator {
	constructor (context) {
		this.sdk = context.sdk
		this.errorReporter = context.errorReporter
		this.analytics = context.analytics
		this.tokenRefreshInterval = null

		this.bindMethods([
			'addChannel',
			'addNotification',
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
			'loadChannelData',
			'loadViewResults',
			'login',
			'loginWithToken',
			'logout',
			'queryAPI',
			'removeChannel',
			'removeFlow',
			'removeNotification',
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
			'setCoreState',
			'setStatus',
			'setTimelineMessage',
			'setTypes',
			'setGroups',
			'setUIState',
			'setLensState',
			'setUser',
			'setViewData',
			'setViewLens',
			'setViewStarred',
			'signalTyping',
			'signup',
			'streamView',
			'updateChannel',
			'updateUser',
			'upsertViewData'
		])

		// Card exists here until it's loaded
		const loadingCardCache = {}

		this.notify = ({
			user,
			card,
			cardType
		}) => {
			return (dispatch, getState) => {
				// Skip notifications if the user's status is set to 'Do Not Disturb'
				const userStatus = selectors.getCurrentUserStatus(getState())
				if (_.get(userStatus, [ 'value' ]) === 'DoNotDisturb') {
					return
				}

				const baseType = card.type.split('@')[0]
				const title = `New ${_.get(cardType, [ 'name' ], baseType)}`
				const body = _.get(card, [ 'data', 'payload', 'message' ])
				const target = _.get(card, [ 'data', 'target' ])

				createNotification({
					title,
					body,
					target,
					historyPush: (path, pathState) => dispatch(push(path, pathState))
				})
			}
		}

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

	setCoreState (state) {
		return {
			type: actions.SET_CORE_STATE,
			value: state
		}
	}

	setUIState (state) {
		return {
			type: actions.SET_UI_STATE,
			value: state
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
		return (dispatch, getState) => {
			if (channel.data.canonical === false) {
				return
			}
			const {
				target, cardType
			} = channel.data

			const load = (retries = MAX_RETRIES) => {
				if (!retries) {
					return null
				}

				return this.sdk.card.getWithTimeline(target, {
					type: cardType
				})
					.then((result) => {
						if (!result) {
							const currentChannel = _.find(selectors.getChannels(getState()), {
								id: channel.id
							})
							if (!currentChannel) {
								return null
							}

							// If a card can't be retrieved with its timeline, try to
							// retrieve it on its own
							return Bluebird.delay(500)
								.then(() => {
									return this.sdk.card.get(target, {
										type: cardType
									})
								})
								.then((standaloneCard) => {
									if (standaloneCard) {
										return standaloneCard
									}
									return load(retries - 1)
								})
						}
						return result
					})
					.catch((error) => {
						// TODO: make retries an optional feature of the SDK
						// Retry in the event of network disruption
						if (retries - 1) {
							console.error(`Caught error loading ${target}: retrying now.`, error)
							load(retries - 1)
						} else {
							throw error
						}
					})
			}
			// eslint-disable-next-line consistent-return
			return load()
				.then((head) => {
					const currentChannel = _.find(selectors.getChannels(getState()), {
						id: channel.id
					})
					if (!currentChannel) {
						return null
					}
					const clonedChannel = clone(currentChannel)

					// Don't bother is the channel head card hasn't changed
					if (head && fastEquals.deepEqual(clonedChannel.data.head, head)) {
						return null
					}

					// If head is null, this indicates a 404 not found error
					clonedChannel.data.head = head
					return dispatch({
						type: actions.UPDATE_CHANNEL,
						value: clonedChannel
					})
				})
				.then(async () => {
					const identifier = isUUID(target) ? 'id' : 'slug'
					const stream = await this.sdk.stream({
						$$links: {
							'has attached element': {
								type: 'object'
							}
						},
						type: 'object',
						properties: {
							[identifier]: {
								type: 'string',
								const: target
							}
						},
						required: [ identifier ]
					})

					const hash = hashCode(target)

					if (streams[hash]) {
						streams[hash].close()
						Reflect.deleteProperty(streams, hash)
					}
					streams[hash] = stream

					stream.on('update', async (payload) => {
						const update = payload.data
						if (update.after) {
							const card = update.after
							const currentChannel = _.find(selectors.getChannels(getState()), {
								id: channel.id
							})
							if (currentChannel) {
								const clonedChannel = clone(currentChannel)

								// Don't bother is the channel head card hasn't changed
								if (fastEquals.deepEqual(clonedChannel.data.head, card)) {
									return
								}
								clonedChannel.data.head = card
								dispatch({
									type: actions.UPDATE_CHANNEL,
									value: clonedChannel
								})
							}
						}
					})

					stream.on('error', (error) => {
						console.error('A stream error occurred', error)
					})
				})
				.catch((error) => {
					dispatch(this.addNotification('danger', error.message))
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
									'user@1.0.0'
								]
							}
						},
						required: [ 'type' ]
					})

					commsStream.on('update', async (payload) => {
						const update = payload.data
						if (update.after) {
							const card = update.after
							const {
								id,
								type
							} = card
							const allChannels = selectors.getChannels(getState())
							const groupsState = selectors.getGroups(getState())

							const baseType = type.split('@')[0]

							// Create a desktop notification if an unread message ping appears
							if (
								update.type === 'insert' &&
								(baseType === 'message' || baseType === 'whisper') &&
								mentionsUser(card, user, groupsState) &&
								!_.includes(_.get(card, [ 'data', 'readBy' ]), user.slug)
							) {
								this.notify({
									user: selectors.getCurrentUser(getState()),
									card,
									cardType: helpers.getType(type, types)
								})(dispatch, getState)
							}

							// If we receive a card that targets another card...
							const targetId = _.get(card, [ 'data', 'target' ])
							if (targetId) {
								// ...update all channels that have this card in their links
								const channelsToUpdate = updateThreadChannels(targetId, card, allChannels)
								for (const updatedChannel of channelsToUpdate) {
									dispatch({
										type: actions.UPDATE_CHANNEL,
										value: updatedChannel
									})
								}

								// TODO (FUTURE): Also update view channels that have a list of threads in them
							}

							// If we receive a user card...
							if (card.type.split('@')[0] === 'user') {
								// ...and we have a corresponding card already cached in our Redux store
								if (selectors.getCard(getState(), id, card.type)) {
									// ...then update the card
									dispatch({
										type: actions.SET_CARD,
										value: card
									})
								}
							}
						}
					})

					const typingTimeouts = {}

					// TODO handle typing notifications in a more generic way, this is an
					// abomination. (A small abomination, but still an abomination)
					commsStream.on('typing', (payload) => {
						if (typingTimeouts[payload.card] && typingTimeouts[payload.card][payload.user]) {
							clearTimeout(typingTimeouts[payload.card][payload.user])
						}
						dispatch({
							type: actions.USER_STARTED_TYPING,
							value: {
								card: payload.card,
								user: payload.user
							}
						})

						_.set(typingTimeouts, [ payload.card, payload.user ], setTimeout(() => {
							dispatch({
								type: actions.USER_STOPPED_TYPING,
								value: {
									card: payload.card,
									user: payload.user
								}
							})
						}, 2 * 1000))
					})

					commsStream.on('error', (error) => {
						console.error('A stream error occurred', error)
					})

					// Load unread message pings
					// TODO Get the Inbox component to use data from the redux store,
					// rather than generating its own queries, allowing us to de-duplicate
					// this schema.
					this.loadViewResults('view-my-inbox')(dispatch, getState)
					this.streamView('view-my-inbox')(dispatch, getState)

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

	addNotification (type, message) {
		if (type === 'danger') {
			console.error(message)
		}
		return (dispatch) => {
			return Bluebird.try(() => {
				const id = uuid()
				dispatch({
					type: actions.ADD_NOTIFICATION,
					value: {
						id,
						type,
						message,
						timestamp: Date.now()
					}
				})
				setTimeout(() => {
					dispatch(this.removeNotification(id))
				}, NOTIFICATION_LIFETIME)
			})
		}
	}

	removeNotification (id) {
		return {
			type: actions.REMOVE_NOTIFICATION,
			value: id
		}
	}

	removeView (view) {
		return async (dispatch, getState) => {
			try {
				const user = selectors.getCurrentUser(getState())
				if (!helpers.isCustomView(view, user)) {
					dispatch(this.addNotification('danger', 'You do not have permission to delete this view'))
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

				dispatch(this.addNotification('success', 'Successfully deleted view'))
			} catch (err) {
				console.error('Failed to remove view', err)
				dispatch(this.addNotification('danger', 'Could not remove view'))
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
					dispatch(this.addNotification('success', successNotification || 'Successfully updated user'))
				}
			} catch (error) {
				dispatch(this.addNotification('danger', error.message || error))
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
					dispatch(this.addNotification('success', 'Successfully created user'))
					return true
				}
				return false
			} catch (error) {
				dispatch(this.addNotification('danger', error.message))
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
				dispatch(this.addNotification('success', 'Sent first-time login token to user'))
				return true
			} catch (error) {
				dispatch(this.addNotification('danger', error.message))
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

				dispatch(this.addNotification('success', 'Successfully changed password'))
			} catch (error) {
				dispatch(this.addNotification('danger', error.message || error))
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

	// View specific action creators
	loadViewResults (query, options = {}) {
		return async (dispatch, getState) => {
			const id = getViewId(query)
			const requestTimestamp = Date.now()
			pendingLoadRequests[id] = requestTimestamp

			const user = selectors.getCurrentUser(getState())

			try {
				const rawSchema = await loadSchema(this.sdk, query, user)
				if (!rawSchema) {
					return
				}

				const schema = options.mask ? options.mask(clone(rawSchema)) : rawSchema

				schema.description = schema.description || 'View action creators'

				const queryOptions = _.isEmpty(options) ? {} : {
					limit: options.limit,
					skip: options.limit * options.page,
					sortBy: options.sortBy,
					sortDir: options.sortDir
				}

				const data = await this.sdk.query(schema, queryOptions)

				// Only update the store if this request is still the most recent once
				if (pendingLoadRequests[id] === requestTimestamp) {
					if (options.page) {
						dispatch(this.appendViewData(query, data))
					} else {
						dispatch(this.setViewData(query, data))
					}
				}

				// eslint-disable-next-line consistent-return
				return data
			} catch (error) {
				console.error(error)
				dispatch(this.addNotification('danger', error.message || error))
				throw error
			}
		}
	}

	clearViewData (query) {
		const id = getViewId(query)
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
					dispatch(this.addNotification('success', 'Created new link'))
				}
			} catch (error) {
				dispatch(this.addNotification('danger', error.message))
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

	streamView (query, options = {}) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())
			const viewId = getViewId(query)
			return loadSchema(this.sdk, query, user)
				.then(async (rawSchema) => {
					if (!rawSchema) {
						return
					}

					const schema = options.mask ? options.mask(clone(rawSchema)) : rawSchema

					if (streams[viewId]) {
						streams[viewId].close()
						Reflect.deleteProperty(streams, viewId)
					}

					streams[viewId] = await this.sdk.stream(schema)

					streams[viewId].on(
						'update',
						/* eslint-disable consistent-return */
						(response) => {
							// Use the async dispatch queue here, as we want to ensure that
							// each update causes a store update one at a time, to prevent
							// race conditions. For example, removing a data item happens
							// quicker then adding a data item as we don't need to load links
							asyncDispatchQueue.enqueue((async () => {
								const {
									after, before
								} = response.data
								const afterValid = after && skhema.isValid(schema, after)
								const beforeValid = before && skhema.isValid(schema, before)

								// If before is non-null then the card has been updated
								if (beforeValid) {
									// If after is null, the item has been removed from the result set
									if (!after || !afterValid) {
										return this.removeViewDataItem(query, before)
									}

									const card = await this.getCardWithLinks(schema, after)

									if (!card) {
										return
									}

									return this.upsertViewData(query, {
										...after,
										links: card.links
									})
								}
								if (!before && afterValid) {
									// Otherwise, if before is null, this is a new item
									const card = await this.getCardWithLinks(schema, after)

									if (!card) {
										return
									}

									return this.appendViewData(query, {
										...after,
										links: card.links
									})
								}
							})(), dispatch)
						}
					)
				})
				.catch((error) => {
					dispatch(this.addNotification('danger', error.message || error))
				})
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

	removeViewDataItem (query, data) {
		const id = getViewId(query)
		return {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	}

	setViewData (query, data) {
		const id = getViewId(query)
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data
			}
		}
	}

	upsertViewData (query, data) {
		const id = getViewId(query)
		return {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	}

	appendViewData (query, data) {
		const id = getViewId(query)

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
					dispatch(this.addNotification('danger', error.message))
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
