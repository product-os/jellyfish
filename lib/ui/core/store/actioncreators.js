/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

import clone from 'deep-copy'
import * as Bluebird from 'bluebird'
import * as fastEquals from 'fast-equals'
import * as _ from 'lodash'
import * as skhema from 'skhema'
import uuid from 'uuid/v4'
import actions from './actions'
import * as helpers from '../../services/helpers'
import {
	createNotification
} from '../../services/notifications'

// Refresh the session token once every 3 hours
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 60 * 1000

const notify = ({
	user,
	card
}) => {
	const title = `new ${card.type}`
	const body = _.get(card, [ 'data', 'payload', 'message' ])
	const target = _.get(card, [ 'data', 'target' ])

	createNotification({
		title,
		body,
		target
	})
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
	if (query.type === 'view') {
		return helpers.getViewSchema(query, user)
	}
	return query
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
	getAccounts: (state) => { return state.core.accounts },
	getActor: (state, id) => {
		return _.get(state.core, [ 'actors', id ], null)
	},
	getOrgs: (state) => { return state.core.orgs },
	getAppVersion: (state) => { return _.get(state.core, [ 'config', 'version' ]) || null },
	getAppCodename: (state) => { return _.get(state.core, [ 'config', 'codename' ]) || null },
	getChangelog: (state) => { return _.get(state.core, [ 'config', 'changelog' ]) || null },
	getChannels: (state) => { return state.core.channels },
	getCurrentUser: (state) => { return _.get(state.core, [ 'session', 'user' ]) || null },
	getNotifications: (state) => { return state.core.notifications || [] },
	getSessionToken: (state) => { return _.get(state.core, [ 'session', 'authToken' ]) || null },
	getStatus: (state) => { return state.core.status },
	getTimelineMessage: (state, target) => {
		return _.get(state.core, [ 'ui', 'timelines', target, 'message' ], '')
	},
	getTypes: (state) => { return state.core.types },
	getUIState: (state) => { return state.core.ui },
	getLensState: (state, lensSlug, cardId) => {
		return _.get(state.core.ui, [ 'lensState', lensSlug, cardId ], {})
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
	getUsersViewLens: (state, viewId) => {
		const user = selectors.getCurrentUser(state)
		return _.get(user, [ 'data', 'profile', 'viewSettings', viewId, 'lens' ], null)
	}
}

const pendingLoadRequests = {}
const streams = {}

const NOTIFICATION_LIFETIME = 10 * 1000
const MAX_RETRIES = 4

let mutableMegaStream = null

const subscribeToCoreFeed = (channel, listener) => {
	mutableMegaStream.on(channel, listener)
	return {
		close: () => {
			if (mutableMegaStream) {
				mutableMegaStream.removeListener(channel, listener)
			}
		}
	}
}

const POLL_TIMEOUT = 1000 * 30

export default class ActionCreator {
	constructor (context) {
		this.sdk = context.sdk
		this.analytics = context.analytics
		this.tokenRefreshInterval = null

		this.bindMethods([
			'addChannel',
			'addNotification',
			'addSubscription',
			'addViewNotice',
			'appendViewData',
			'authorizeIntegration',
			'bootstrap',
			'clearViewData',
			'createLink',
			'dumpState',
			'getIntegrationAuthUrl',
			'getActor',
			'getFile',
			'getCardWithLinks',
			'loadChannelData',
			'loadViewResults',
			'login',
			'loginWithToken',
			'logout',
			'queryAPI',
			'removeChannel',
			'removeNotification',
			'removeViewDataItem',
			'removeViewNotice',
			'saveSubscription',
			'setAuthToken',
			'setChannels',
			'setDefault',
			'setOrgs',
			'setPassword',
			'setSendCommand',
			'setState',
			'setStatus',
			'setTimelineMessage',
			'setTypes',
			'setUIState',
			'setLensState',
			'setUser',
			'setViewData',
			'setViewLens',
			'signalTyping',
			'signup',
			'streamView',
			'updateChannel',
			'upsertViewData'
		])
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	getFile (cardId, fileName) {
		return (dispatch) => {
			return this.sdk.getFile(cardId, fileName)
		}
	}

	getIntegrationAuthUrl (user, integration) {
		return async () => {
			return this.sdk.integrations.getAuthorizationUrl(user, integration)
		}
	}

	getActor (id) {
		return async (dispatch, getState) => {
			let actor = null
			let name = 'unknown user'
			let email = null

			// IF proxy is true, it indicates that the actor has been created as a proxy
			// for a real user in JF, usually as a result of syncing from an external
			// service
			let proxy = false

			if (!id) {
				return null
			}

			const cachedCard = selectors.getActor(getState(), id)

			if (cachedCard) {
				actor = cachedCard
			} else {
				const result = await this.sdk.query({
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
					actor = await this.sdk.card.get(id)
				}

				dispatch({
					type: actions.SET_ACTOR,
					value: actor
				})
			}

			email = _.get(actor, [ 'data', 'email' ], '')

			const isBalenaTeam = _.find(
				_.get(actor, [ 'links', 'is member of' ], []),
				{
					slug: 'org-balena'
				}
			)

			// Check if the user is part of the balena org
			if (isBalenaTeam) {
				name = actor.slug.replace('user-', '')
			} else {
				proxy = true
				let handle = _.get(actor, [ 'data', 'handle' ])
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
				proxy,
				card: actor
			}
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

	setState (state) {
		return {
			type: actions.SET_STATE,
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
		if (!data.cardType) {
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

	bootstrap () {
		return (dispatch, getState) => {
			return Bluebird.props({
				user: this.sdk.auth.whoami(),
				orgs: this.sdk.card.getAllByType('org'),
				types: this.sdk.card.getAllByType('type'),
				config: this.sdk.getConfig(),
				stream: this.sdk.stream({
					type: 'object',
					additionalProperties: true
				})
			})
				.then(({
					user, types, orgs, config, stream
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
						dispatch({
							type: actions.SET_CONFIG,
							value: config
						})
						const channels = selectors.getChannels(state)
						channels.forEach((channel) => {
							return dispatch(this.loadChannelData(channel))
						})
					}

					this.tokenRefreshInterval = setInterval(async () => {
						const newToken = await this.sdk.auth.refreshToken()
						dispatch(this.setAuthToken(newToken))
					}, TOKEN_REFRESH_INTERVAL)

					mutableMegaStream = stream
					stream.on('update', async (payload) => {
						const update = payload.data
						if (update.after) {
							const card = update.after
							const {
								id,
								slug
							} = card
							const allChannels = selectors.getChannels(getState())
							const channel = _.find(allChannels, (item) => {
								const target = _.get(item, [ 'data', 'target' ])
								return target === slug || target === id
							})
							if (channel) {
								const clonedChannel = clone(channel)

								const cardWithTimeline = _.get(card.linked_at, [ 'has attached element' ])
									? await this.sdk.card.getWithTimeline(card.id)
									: card

								// Don't bother is the channel head card hasn't changed
								if (fastEquals.deepEqual(clonedChannel.data.head, cardWithTimeline)) {
									return
								}
								clonedChannel.data.head = cardWithTimeline
								dispatch({
									type: actions.UPDATE_CHANNEL,
									value: clonedChannel
								})
							}
						}
					})

					const typingTimeouts = {}

					stream.on('typing', (payload) => {
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

					stream.on('error', (error) => {
						console.error('A stream error occurred', error)
					})

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
		if (mutableMegaStream) {
			mutableMegaStream.close()
			mutableMegaStream = null
			this.sdk.auth.logout()
		}
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

	setPassword (currentPassword, newPassword) {
		return async (dispatch, getState) => {
			try {
				const user = selectors.getCurrentUser(getState())
				await this.sdk.action({
					card: user.id,
					action: 'action-set-password',
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
			try {
				const user = await this.sdk.auth.whoami()
				_.set(user, [ 'data', 'profile', 'sendCommand' ], command)

				await this.sdk.card.update(user.id, user)

				const updatedUser = await this.sdk.getById(user.id)

				dispatch(this.setUser(updatedUser))
				dispatch(this.addNotification('success', `Successfully set "${command}" as send command`))
			} catch (error) {
				dispatch(this.addNotification('danger', error.message || error))
			}
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
				const schema = await loadSchema(this.sdk, query, user)
				if (!schema) {
					return
				}

				schema.description = schema.description || 'View action creators'

				const queryOptions = _.isEmpty(options) ? {} : {
					limit: options.limit,
					skip: options.limit * options.page,
					sortBy: options.sortBy,
					sortDir: options.sortDir
				}

				const data = await this.sdk.query(schema, queryOptions)

				const poll = () => {
					setTimeout(async () => {
						if (pendingLoadRequests[id] !== requestTimestamp) {
							return
						}
						const pollOptions = _.isEmpty(options) ? {} : {
							limit: options.limit * (options.page + 1),
							skip: 0,
							sortBy: options.sortBy,
							sortDir: options.sortDir
						}
						const pollResult = await this.sdk.query(schema, pollOptions)
						if (pendingLoadRequests[id] === requestTimestamp) {
							dispatch(this.setViewData(query, pollResult))
							poll()
						}
					}, POLL_TIMEOUT)
				}

				// Only update the store if this request is still the most recent once
				if (pendingLoadRequests[id] === requestTimestamp) {
					poll()
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

	streamView (query) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())
			const viewId = getViewId(query)
			return loadSchema(this.sdk, query, user)
				.then((schema) => {
					if (!schema) {
						return
					}
					if (streams[viewId]) {
						streams[viewId].close()
						Reflect.deleteProperty(streams, viewId)
					}
					streams[viewId] = subscribeToCoreFeed(
						'update',
						/* eslint-disable consistent-return */
						async (response) => {
							const {
								after, before
							} = response.data
							const afterValid = after && skhema.isValid(schema, after)
							const beforeValid = before && skhema.isValid(schema, before)

							// If before is non-null then the card has been updated
							if (beforeValid) {
								// If after is null, the item has been removed from the result set
								if (!after || !afterValid) {
									return dispatch(this.removeViewDataItem(query, before))
								}

								const card = await this.getCardWithLinks(schema, after)

								if (!card) {
									return
								}

								return dispatch(this.upsertViewData(query, card))
							}
							if (!before && afterValid) {
								// Otherwise, if before is null, this is a new item
								const card = await this.getCardWithLinks(schema, after)

								if (viewId === 'view-my-inbox') {
									notify({
										user: selectors.getCurrentUser(getState()),
										card: after
									})
								}

								if (!card) {
									return
								}

								return dispatch(this.appendViewData(query, card))
							}
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
			this.sdk.card.update(user.id, {
				type: 'user',
				data: {
					profile: {
						homeView: card.id
					}
				}
			})
				.then(() => {
					dispatch(this.addNotification('success', `Set ${card.name || card.slug} as default view`))
				})
				.catch((error) => {
					dispatch(this.addNotification('danger', error.message || error))
				})
		}
	}

	setViewLens (viewId, lensSlug) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())

			this.sdk.card.update(user.id, {
				type: 'user',
				data: {
					profile: {
						viewSettings: {
							[viewId]: {
								lens: lensSlug
							}
						}
					}
				}
			})
				.then((result) => {
					return this.sdk.getById(user.id)
				})
				.then((updatedUser) => {
					dispatch(this.setUser(updatedUser))
				})
				.catch((error) => {
					dispatch(this.addNotification('danger', error.message || error))
				})
		}
	}

	signalTyping (card) {
		return (dispatch, getState) => {
			const user = selectors.getCurrentUser(getState())
			mutableMegaStream.type(user.slug, card)
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
						const: 'subscription'
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

	saveSubscription (subscription, target) {
		this.sdk.card.update(subscription.id, subscription)
		return {
			type: actions.SAVE_SUBSCRIPTION,
			value: {
				data: subscription,
				id: target
			}
		}
	}
}
