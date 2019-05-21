/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import * as _ from 'lodash'
import * as redux from 'redux'
import uuid from 'uuid/v4'
import actions from './actions'

const viewsReducer = (state, action) => {
	if (!state) {
		return {
			subscriptions: {},
			viewData: {}
		}
	}
	switch (action.type) {
		case actions.SET_VIEW_DATA: {
			state.viewData[action.value.id] = action.value.data
			return state
		}
		case actions.REMOVE_VIEW_DATA_ITEM: {
			if (state.viewData[action.value.id]) {
				state.viewData[action.value.id] = state.viewData[action.value.id].filter((item) => {
					return item.id !== action.value.data.id
				})
			}
			return state
		}
		case actions.UPSERT_VIEW_DATA_ITEM: {
			let upsertTarget = state.viewData[action.value.id]
			const update = action.value.data
			if (upsertTarget) {
				const index = _.findIndex(upsertTarget, {
					id: update.id
				})
				if (index === -1) {
					upsertTarget.push(update)
				} else {
					upsertTarget.splice(index, 1, update)
				}
			} else {
				upsertTarget = [ update ]
			}
			state.viewData[action.value.id] = upsertTarget.slice()
			return state
		}
		case actions.APPEND_VIEW_DATA_ITEM: {
			const appendTarget = state.viewData[action.value.id] || []
			if (_.isArray(action.value.data)) {
				appendTarget.push(...action.value.data)
			} else {
				appendTarget.push(action.value.data)
			}
			state.viewData[action.value.id] = appendTarget.slice()
			return state
		}
		case actions.SAVE_SUBSCRIPTION: {
			state.subscriptions[action.value.id] = action.value.data
			return state
		}
		default:
			return state
	}
}

const getDefaultState = () => {
	return {
		core: {
			status: 'initializing',
			channels: [
				{
					id: uuid(),
					created_at: new Date().toISOString(),
					slug: `channel-${uuid()}`,
					type: 'channel',
					version: '1.0.0',
					tags: [],
					markers: [],
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					data: {
						target: 'view-all-views',
						cardType: 'view'
					}
				}
			],
			types: [],
			session: null,
			notifications: [],
			viewNotices: {},
			actors: {},
			orgs: [],
			config: {},
			ui: {
				sidebar: {
					expanded: []
				},
				timelines: {}
			}
		},
		views: {
			viewData: {},
			subscriptions: {},
			activeView: null
		}
	}
}

const coreReducer = (state, action) => {
	if (!state) {
		return getDefaultState().core
	}
	let newState = clone(state)
	switch (action.type) {
		case actions.LOGOUT: {
			newState = getDefaultState().core
			newState.status = 'unauthorized'

			return newState
		}
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
		case actions.SET_ACTOR: {
			const actor = action.value
			_.set(newState, [ 'actors', actor.id ], actor)

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
		case actions.SET_TIMELINE_MESSAGE: {
			const {
				target,
				message
			} = action.value
			_.set(newState, [ 'ui', 'timelines', target, 'message' ], message)

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
		case actions.SET_CONFIG: {
			newState.config = action.value
			return newState
		}
		case actions.SET_UI_STATE: {
			newState.ui = action.value
			return newState
		}
		case actions.USER_STARTED_TYPING: {
			_.set(newState, [ 'usersTyping', action.value.card, action.value.user ], true)
			return newState
		}
		case actions.USER_STOPPED_TYPING: {
			_.unset(newState, [ 'usersTyping', action.value.card, action.value.user ])
			return newState
		}

		default:
			return newState
	}
}

export const reducer = redux.combineReducers({
	core: coreReducer,
	views: viewsReducer
})
