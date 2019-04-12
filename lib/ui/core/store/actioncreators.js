/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

import * as Bluebird from 'bluebird'
import * as fastEquals from 'fast-equals'
import * as _ from 'lodash'
import * as skhema from 'skhema'
import uuid from 'uuid/v4'
import actions from './actions'
const helpers = require('../../services/helpers')

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

const loadSchema = async (sdk, query) => {
	if (_.isString(query)) {
		return sdk.card.get(query, {
			type: 'view'
		})
			.then(helpers.getViewSchema)
	}
	if (query.type === 'view') {
		return helpers.getViewSchema(query)
	}
	return query
}

const getViewId = (query) => {
	if (_.isString(query)) {
		return query
	}
	if (query.id) {
		return query.id
	}
	return `${hashCode(JSON.stringify(query))}`
}

export const selectors = {
	getAccounts: (state) => { return state.core.accounts },
	getOrgs: (state) => { return state.core.orgs },
	getAllUsers: (state) => { return state.core.allUsers },
	getAppVersion: (state) => { return _.get(state.core, [ 'config', 'version' ]) || null },
	getAppCodename: (state) => { return _.get(state.core, [ 'config', 'codename' ]) || null },
	getChangelog: (state) => { return _.get(state.core, [ 'config', 'changelog' ]) || null },
	getChannels: (state) => { return state.core.channels },
	getCurrentUser: (state) => { return _.get(state.core, [ 'session', 'user' ]) || null },
	getNotifications: (state) => { return state.core.notifications || [] },
	getSessionToken: (state) => { return _.get(state.core, [ 'session', 'authToken' ]) || null },
	getStatus: (state) => { return state.core.status },
	getTypes: (state) => { return state.core.types },
	getUIState: (state) => { return state.core.ui },
	getViewNotices: (state) => { return state.core.viewNotices },

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

		this.bindMethods([
			'addChannel',
			'addNotification',
			'addSubscription',
			'addViewNotice',
			'appendViewData',
			'bootstrap',
			'clearViewData',
			'getCardWithLinks',
			'loadChannelData',
			'loadViewResults',
			'login',
			'loginWithToken',
			'logout',
			'removeChannel',
			'removeNotification',
			'removeViewDataItem',
			'removeViewNotice',
			'saveSubscription',
			'setAccounts',
			'setAllUsers',
			'setAuthToken',
			'setChannels',
			'setDefault',
			'setOrgs',
			'setSendCommand',
			'setState',
			'setStatus',
			'setTypes',
			'setUIState',
			'setUser',
			'setViewData',
			'setViewLens',
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
					const clonedChannel = _.cloneDeep(currentChannel)

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

	addChannel (channel) {
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

	setChannels (channels) {
		return {
			type: actions.SET_CHANNELS,
			value: channels
		}
	}

	bootstrap () {
		return (dispatch, getState) => {
			return Bluebird.props({
				user: this.sdk.auth.whoami(),
				orgs: this.sdk.card.getAllByType('org'),
				accounts: this.sdk.card.getAllByType('account'),
				types: this.sdk.card.getAllByType('type'),
				allUsers: this.sdk.card.getAllByType('user'),
				config: this.sdk.getConfig(),
				stream: this.sdk.stream({
					type: 'object',
					additionalProperties: true
				})
			})
				.then(({
					user, accounts, types, allUsers, orgs, config, stream
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
						dispatch(this.setAllUsers(allUsers))
						dispatch(this.setAccounts(accounts))
						dispatch({
							type: actions.SET_CONFIG,
							value: config
						})
						const channels = selectors.getChannels(state)
						channels.forEach((channel) => {
							return dispatch(this.loadChannelData(channel))
						})
					}
					mutableMegaStream = stream
					stream.on('update', async (payload) => {
						const update = payload.data
						if (update.after) {
							const card = update.after
							const {
								id
							} = card
							const allChannels = selectors.getChannels(getState())
							const channel = _.find(allChannels, [ 'data.target', id ])
							if (channel) {
								const clonedChannel = _.cloneDeep(channel)

								const cardWithTimeline = card.linked_at['has attached element']
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

	setUser (user) {
		return {
			type: actions.SET_USER,
			value: user
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

	setAllUsers (users) {
		return {
			type: actions.SET_ALL_USERS,
			value: users
		}
	}

	setAccounts (accounts) {
		return {
			type: actions.SET_ACCOUNTS,
			value: accounts
		}
	}

	setSendCommand (command) {
		return async (dispatch, getState) => {
			try {
				const user = await this.sdk.auth.whoami()
				_.set(user, [ 'data', 'profile', 'sendCommand' ], command)
				const result = await this.sdk.card.update(user.id, user)

				dispatch(this.setUser(result))
				dispatch(this.addNotification('success', `Successfully set "${command}" as send command`))
			} catch (error) {
				dispatch(this.addNotification('danger', error.message || error))
			}
		}
	}

	// View specific action creators
	loadViewResults (query, options) {
		return async (dispatch) => {
			const id = getViewId(query)
			const requestTimestamp = Date.now()
			pendingLoadRequests[id] = requestTimestamp

			try {
				const schema = await loadSchema(this.sdk, query)
				if (!schema) {
					return
				}

				schema.description = schema.description || 'View action creators'
				const data = await this.sdk.query(schema, {
					limit: options.limit,
					skip: options.limit * options.page,
					sortBy: options.sortBy,
					sortDir: options.sortDir
				})

				const poll = () => {
					setTimeout(async () => {
						if (pendingLoadRequests[id] !== requestTimestamp) {
							return
						}
						const pollResult = await this.sdk.query(schema, {
							limit: options.limit * (options.page + 1),
							skip: 0,
							sortBy: options.sortBy,
							sortDir: options.sortDir
						})
						if (pendingLoadRequests[id] === requestTimestamp) {
							dispatch(this.setViewData(query, pollResult))
							poll()
						}
					}, POLL_TIMEOUT)
				}

				// Only update the store if this request is still the most recent once
				if (pendingLoadRequests[id] === requestTimestamp) {
					poll()
					if (options.page === 0) {
						dispatch(this.setViewData(query, data))
					} else {
						dispatch(this.appendViewData(query, data))
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

	streamView (query) {
		return (dispatch, getState) => {
			const viewId = getViewId(query)
			return loadSchema(this.sdk, query)
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
					dispatch(this.setUser(result))
				})
				.catch((error) => {
					dispatch(this.addNotification('danger', error.message || error))
				})
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
