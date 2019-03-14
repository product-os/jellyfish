
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* global process */
/* eslint-disable no-process-env */
const Bluebird = require('bluebird')
const fastEquals = require('fast-equals')
const _ = require('lodash')
const uuid = require('uuid/v4')
const core = require('../')
const common = require('../common')
const sdk = require('../sdk')
const NOTIFICATION_LIFETIME = 10 * 1000
let mutableMegaStream = null

exports.coreSelectors = {
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
	getViewNotices: (state) => { return state.core.viewNotices }
}

const actions = {
	SET_STATUS: 'SET_STATUS',
	SET_STATE: 'SET_STATE',
	SET_TYPES: 'SET_TYPES',
	SET_ORGS: 'SET_ORGS',
	SET_ACCOUNTS: 'SET_ACCOUNTS',
	SET_ALL_USERS: 'SET_ALL_USERS',
	UPDATE_CHANNEL: 'UPDATE_CHANNEL',
	ADD_CHANNEL: 'ADD_CHANNEL',
	REMOVE_CHANNEL: 'REMOVE_CHANNEL',
	SET_CHANNELS: 'SET_CHANNELS',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	LOGOUT: 'LOGOUT',
	SET_USER: 'SET_USER',
	ADD_NOTIFICATION: 'ADD_NOTIFICATION',
	REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
	ADD_VIEW_NOTICE: 'ADD_VIEW_NOTICE',
	REMOVE_VIEW_NOTICE: 'REMOVE_VIEW_NOTICE',
	SET_CONFIG: 'SET_CONFIG',
	SET_UI_STATE: 'SET_UI_STATE'
}
exports.actionCreators = {
	setState: (state) => {
		return {
			type: actions.SET_STATE,
			value: state
		}
	},
	setUIState: (state) => {
		return {
			type: actions.SET_UI_STATE,
			value: state
		}
	},
	loadChannelData: (channel) => {
		return function (dispatch, getState) {
			if (channel.data.canonical === false) {
				return
			}
			const {
				target, cardType
			} = channel.data

			const load = () => {
				return sdk.sdk.card.getWithTimeline(target, {
					type: cardType
				})
					.then((result) => {
						if (!result) {
							const currentChannel = _.find(exports.coreSelectors.getChannels(getState()), {
								id: channel.id
							})
							if (!currentChannel) {
								return null
							}

							// If a card can't be retrieved with its timeline, try to
							// retrieve it on its own
							return Bluebird.delay(250)
								.then(() => {
									return sdk.sdk.card.get(target, {
										type: cardType
									})
								})
								.then((standaloneCard) => {
									if (standaloneCard) {
										return standaloneCard
									}
									return load()
								})
						}
						return result
					})
			}
			// eslint-disable-next-line consistent-return
			return load()
				.then((head) => {
					if (!head) {
						return null
					}
					const currentChannel = _.find(exports.coreSelectors.getChannels(getState()), {
						id: channel.id
					})
					if (!currentChannel) {
						return null
					}
					const clonedChannel = _.cloneDeep(currentChannel)

					// Don't bother is the channel head card hasn't changed
					if (fastEquals.deepEqual(clonedChannel.data.head, head)) {
						return null
					}
					clonedChannel.data.head = head
					return dispatch({
						type: actions.UPDATE_CHANNEL,
						value: clonedChannel
					})
				})
				.catch((error) => {
					dispatch(exports.actionCreators.addNotification('danger', error.message))
				})
		}
	},
	updateChannel: (channel) => {
		return {
			type: actions.UPDATE_CHANNEL,
			value: channel
		}
	},
	addChannel: (channel) => {
		return (dispatch) => {
			dispatch({
				type: actions.ADD_CHANNEL,
				value: channel
			})
			return dispatch(exports.actionCreators.loadChannelData(channel))
		}
	},
	removeChannel: (channel) => {
		return {
			type: actions.REMOVE_CHANNEL,
			value: channel
		}
	},
	setChannels: (channels) => {
		return {
			type: actions.SET_CHANNELS,
			value: channels
		}
	},
	bootstrap: () => {
		return (dispatch, getState) => {
			return Bluebird.props({
				user: sdk.sdk.auth.whoami(),
				orgs: sdk.sdk.card.getAllByType('org'),
				accounts: sdk.sdk.card.getAllByType('account'),
				types: sdk.sdk.card.getAllByType('type'),
				allUsers: sdk.sdk.card.getAllByType('user'),
				config: sdk.sdk.getConfig(),
				stream: sdk.sdk.stream({
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
					if (exports.coreSelectors.getSessionToken(state)) {
						dispatch(exports.actionCreators.setUser(user))
						dispatch(exports.actionCreators.setTypes(types))
						dispatch(exports.actionCreators.setOrgs(orgs))
						dispatch(exports.actionCreators.setAllUsers(allUsers))
						dispatch(exports.actionCreators.setAccounts(accounts))
						dispatch({
							type: actions.SET_CONFIG,
							value: config
						})
						const channels = exports.coreSelectors.getChannels(state)
						channels.forEach((channel) => {
							return dispatch(exports.actionCreators.loadChannelData(channel))
						})
					}
					stream.setMaxListeners(50)
					mutableMegaStream = stream
					stream.on('update', async (update) => {
						if (update.after) {
							const card = update.after
							const {
								id
							} = card
							const allChannels = exports.coreSelectors.getChannels(getState())
							const channel = _.find(allChannels, [ 'data.target', id ])
							if (channel) {
								const clonedChannel = _.cloneDeep(channel)

								const cardWithTimeline = card.links['has attached element']
									? await sdk.sdk.card.getWithTimeline(card.id)
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

					return user
				})
		}
	},
	setAuthToken: (token) => {
		return {
			type: actions.SET_AUTHTOKEN,
			value: token
		}
	},
	loginWithToken: (token) => {
		return (dispatch, getState) => {
			return sdk.sdk.auth.loginWithToken(token)
				.then(() => { return dispatch(exports.actionCreators.setAuthToken(token)) })
				.then(() => { return dispatch(exports.actionCreators.bootstrap()) })
				.then(() => { return dispatch(exports.actionCreators.setStatus('authorized')) })
				.then(() => {
					core.analytics.track('ui.loginWithToken')
					core.analytics.identify(exports.coreSelectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(exports.actionCreators.setStatus('unauthorized'))
					throw error
				})
		}
	},
	login: (payload) => {
		return (dispatch, getState) => {
			return sdk.sdk.auth.login(payload)
				.then((session) => { return dispatch(exports.actionCreators.setAuthToken(session.id)) })
				.then(() => { return dispatch(exports.actionCreators.bootstrap()) })
				.then(() => { return dispatch(exports.actionCreators.setStatus('authorized')) })
				.then(() => {
					core.analytics.track('ui.login')
					core.analytics.identify(exports.coreSelectors.getCurrentUser(getState()).id)
				})
				.catch((error) => {
					dispatch(exports.actionCreators.setStatus('unauthorized'))
					throw error
				})
		}
	},
	logout: () => {
		core.analytics.track('ui.logout')
		core.analytics.identify()
		if (mutableMegaStream) {
			mutableMegaStream.destroy()
			mutableMegaStream = null
		}
		return {
			type: actions.LOGOUT
		}
	},
	signup: (payload) => {
		return (dispatch) => {
			return sdk.sdk.auth.signup(payload)
				.then(() => {
					core.analytics.track('ui.signup')
					dispatch(exports.actionCreators.login(payload))
				})
		}
	},
	setStatus: (status) => {
		// If the status is now 'unauthorized' just run the logout routine
		if (status === 'unauthorized') {
			return {
				type: actions.LOGOUT
			}
		}
		return {
			type: actions.SET_STATUS,
			value: status
		}
	},
	setUser: (user) => {
		return {
			type: actions.SET_USER,
			value: user
		}
	},
	setTypes: (types) => {
		return {
			type: actions.SET_TYPES,
			value: types
		}
	},
	setOrgs: (orgs) => {
		return {
			type: actions.SET_ORGS,
			value: orgs
		}
	},
	addNotification: (type, message) => {
		if (process.env.NODE_ENV === 'test' && type === 'danger') {
			console.warn('An error notification was triggered in a test environment', message)
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
					dispatch(exports.actionCreators.removeNotification(id))
				}, NOTIFICATION_LIFETIME)
			})
		}
	},
	removeNotification: (id) => {
		return {
			type: actions.REMOVE_NOTIFICATION,
			value: id
		}
	},
	addViewNotice: (payload) => {
		return {
			type: actions.ADD_VIEW_NOTICE,
			value: payload
		}
	},
	removeViewNotice: (id) => {
		return {
			type: actions.REMOVE_VIEW_NOTICE,
			value: id
		}
	},
	setAllUsers: (users) => {
		return {
			type: actions.SET_ALL_USERS,
			value: users
		}
	},
	setAccounts: (accounts) => {
		return {
			type: actions.SET_ACCOUNTS,
			value: accounts
		}
	}
}
exports.core = (state, action) => {
	if (!state) {
		return common.getDefaultState().core
	}
	const newState = _.cloneDeep(state)
	switch (action.type) {
		case actions.SET_STATE: {
			return action.value
		}
		case actions.UPDATE_CHANNEL: {
			const existingChannel = _.find(newState.channels, {
				id: action.value.id
			})
			if (existingChannel) {
				_.assign(existingChannel, action.value)
			}
			return newState
		}
		case actions.ADD_CHANNEL: {
			if (action.value.data.parentChannel) {
				// If the triggering channel is not the last channel, remove trailing
				// channels. This creates a 'breadcrumb' effect when navigating channels
				const triggerIndex = _.findIndex(newState.channels, {
					id: action.value.data.parentChannel
				})
				if (triggerIndex > -1) {
					const shouldTrim = triggerIndex + 1 < newState.channels.length
					if (shouldTrim) {
						newState.channels = _.take(newState.channels, triggerIndex + 1)
					}
				}
			}
			newState.channels.push(action.value)
			return newState
		}
		case actions.REMOVE_CHANNEL: {
			_.remove(newState.channels, {
				id: action.value.id
			})
			return newState
		}
		case actions.SET_CHANNELS: {
			newState.channels = action.value
			return newState
		}
		case actions.SET_AUTHTOKEN: {
			if (newState.session) {
				newState.session.authToken = action.value
			} else {
				newState.session = {
					authToken: action.value
				}
			}
			return newState
		}
		case actions.SET_USER: {
			if (!newState.session) {
				newState.session = {
					authToken: null
				}
			}
			newState.session.user = action.value
			return newState
		}
		case actions.SET_TYPES: {
			newState.types = action.value
			return newState
		}
		case actions.SET_ORGS: {
			newState.orgs = action.value
			return newState
		}
		case actions.ADD_NOTIFICATION: {
			newState.notifications.push(action.value)

			// Keep at most 2 notifications
			newState.notifications = newState.notifications.slice(-2)
			return newState
		}
		case actions.REMOVE_NOTIFICATION: {
			newState.notifications = _.reject(newState.notifications, {
				id: action.value
			})
			return newState
		}
		case actions.ADD_VIEW_NOTICE: {
			newState.viewNotices[action.value.id] = action.value
			return newState
		}
		case actions.REMOVE_VIEW_NOTICE: {
			if (newState.viewNotices[action.value]) {
				Reflect.deleteProperty(newState.viewNotices, action.value)
			}
			return newState
		}
		case actions.SET_STATUS: {
			newState.status = action.value
			return newState
		}
		case actions.SET_ALL_USERS: {
			newState.allUsers = _.sortBy(action.value, 'slug')
			return newState
		}
		case actions.SET_ACCOUNTS: {
			newState.accounts = _.sortBy(action.value, 'slug')
			return newState
		}
		case actions.SET_CONFIG: {
			newState.config = action.value
			return newState
		}
		case actions.SET_UI_STATE: {
			newState.ui = action.value
			return newState
		}
		default:
			return newState
	}
}
exports.subscribeToCoreFeed = (channel, listener) => {
	mutableMegaStream.on(channel, listener)
	return {
		close: () => {
			if (mutableMegaStream) {
				mutableMegaStream.removeListener(channel, listener)
			}
		}
	}
}
exports.coreActions = actions
exports.coreActionCreators = exports.actionCreators
