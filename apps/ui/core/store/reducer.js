/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import update from 'immutability-helper'
import {
	connectRouter
} from 'connected-react-router'
import * as _ from 'lodash'
import * as redux from 'redux'
import {
	v4 as uuid
} from 'uuid'
import actions from './actions'
import history from '../../services/history'

export const getDefaultState = () => {
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
			groups: {},
			session: null,
			notifications: [],
			viewNotices: {},
			cards: {},
			orgs: [],
			config: {}
		},
		ui: {
			flows: {},
			sidebar: {
				expanded: []
			},
			timelines: {},
			chatWidget: {
				open: false
			}
		},
		views: {
			viewData: {},
			subscriptions: {},
			activeView: null
		}
	}
}

const viewsReducer = (state, action) => {
	if (!state) {
		return getDefaultState().views
	}
	switch (action.type) {
		case actions.SET_VIEW_DATA: {
			return update(state, {
				viewData: {
					[action.value.id]: {
						$set: action.value.data
					}
				}
			})
		}
		case actions.REMOVE_VIEW_DATA_ITEM: {
			if (state.viewData[action.value.id]) {
				const indexToRemove = _.findIndex(state.viewData[action.value.id] || [], {
					id: action.value.data.id
				})
				if (indexToRemove !== -1) {
					return update(state, {
						viewData: {
							[action.value.id]: {
								$splice: [ [ indexToRemove, 1 ] ]
							}
						}
					})
				}
			}
			return state
		}
		case actions.UPSERT_VIEW_DATA_ITEM: {
			const indexToUpdate = _.findIndex(state.viewData[action.value.id] || [], {
				id: action.value.data.id
			})
			return update(state, {
				viewData: {
					[action.value.id]: (dataItems) => update(dataItems || [], indexToUpdate === -1
						? {
							$push: [ action.value.data ]
						}
						: {
							[indexToUpdate]: {
								$set: action.value.data
							}
						}
					)
				}
			})
		}
		case actions.APPEND_VIEW_DATA_ITEM: {
			// Ensure our viewData items are new objects
			const appendTarget = clone(state.viewData[action.value.id] || [])
			if (_.isArray(action.value.data)) {
				appendTarget.push(...action.value.data)
			} else {
				appendTarget.push(action.value.data)
			}

			// Question: Should we really use uniqBy here as it will silently discard
			// the newly added item if there's already an item with the same id?
			return update(state, {
				viewData: {
					[action.value.id]: {
						$set: _.uniqBy(appendTarget, 'id')
					}
				}
			})
		}
		case actions.SAVE_SUBSCRIPTION: {
			return update(state, {
				subscriptions: {
					[action.value.id]: {
						$set: action.value.data
					}
				}
			})
		}
		default:
			return state
	}
}

const uiReducer = (state, action) => {
	if (!state) {
		return getDefaultState().ui
	}

	switch (action.type) {
		case actions.SET_UI_STATE: {
			return action.value
		}
		case actions.SET_LENS_STATE: {
			return update(state, {
				lensState: (lensState) => update(lensState || {}, {
					[action.value.lens]: (lens) => update(lens || {}, {
						[action.value.cardId]: (lensCard) => update(lensCard || {}, {
							$merge: action.value.state
						})
					})
				})
			})
		}
		case actions.SET_TIMELINE_MESSAGE: {
			const {
				target,
				message
			} = action.value
			return update(state, {
				timelines: {
					[target]: (tgt) => update(tgt || {}, {
						message: {
							$set: message
						}
					})
				}
			})
		}
		case actions.SET_FLOW: {
			const {
				flowId,
				cardId,
				flowState
			} = action.value
			return update(state, {
				flows: {
					[flowId]: (flowsById) => update(flowsById || {}, {
						[cardId]: {
							$apply: (existingFlowState) => {
								return _.merge({}, existingFlowState || {}, flowState)
							}
						}
					})
				}
			})
		}
		case actions.REMOVE_FLOW: {
			const {
				flowId,
				cardId
			} = action.value
			return update(state, {
				flows: {
					[flowId]: (flowsById) => update(flowsById || {}, {
						$unset: [ cardId ]
					})
				}
			})
		}

		default:
			return state
	}
}

const coreReducer = (state, action) => {
	if (!state) {
		return getDefaultState().core
	}

	switch (action.type) {
		case actions.LOGOUT: {
			return update(getDefaultState().core, {
				status: {
					$set: 'unauthorized'
				}
			})
		}
		case actions.SET_STATE: {
			return action.value
		}
		case actions.UPDATE_CHANNEL: {
			const existingChannelIndex = _.findIndex(state.channels, {
				id: action.value.id
			})

			// Note: The state will not be changed if the channel is not already
			// in the state
			if (existingChannelIndex !== -1) {
				return update(state, {
					channels: {
						[existingChannelIndex]: {
							$set: action.value
						}
					}
				})
			}
			return state
		}
		case actions.ADD_CHANNEL: {
			let newChannels = clone(state.channels)

			if (action.value.data.parentChannel) {
				// If the triggering channel is not the last channel, remove trailing
				// channels. This creates a 'breadcrumb' effect when navigating channels
				const triggerIndex = _.findIndex(state.channels, {
					id: action.value.data.parentChannel
				})
				if (triggerIndex > -1) {
					const shouldTrim = triggerIndex + 1 < state.channels.length
					if (shouldTrim) {
						newChannels = _.take(newChannels, triggerIndex + 1)
					}
				}
			}
			newChannels.push(action.value)
			return update(state, {
				channels: {
					$set: newChannels
				}
			})
		}
		case actions.REMOVE_CHANNEL: {
			const index = _.findIndex(state.channels, {
				id: action.value.id
			})
			if (index !== -1) {
				return update(state, {
					channels: {
						$splice: [ [ index, 1 ] ]
					}
				})
			}
			return state
		}
		case actions.SET_CHANNELS: {
			return update(state, {
				channels: {
					$set: action.value
				}
			})
		}
		case actions.SET_CARD: {
			const card = action.value
			const cardType = card.type.split('@')[0]
			const prevCard = _.cloneDeep(_.get(state, [ 'cards', cardType, card.id ], {}))
			const mergedCard = _.merge(prevCard, card)
			return update(state, {
				cards: {
					[cardType]: (cardsForType) => update(cardsForType || {}, {
						[card.id]: (existingCard) => update(existingCard || {}, {
							$set: mergedCard
						})
					})
				}
			})
		}
		case actions.SET_AUTHTOKEN: {
			return update(state, {
				session: (session) => update(session || {}, {
					authToken: {
						$set: action.value
					}
				})
			})
		}
		case actions.SET_USER: {
			return update(state, {
				session: (session) => update(session || {
					authToken: null
				}, {
					user: {
						$set: action.value
					}
				})
			})
		}
		case actions.SET_TYPES: {
			return update(state, {
				types: {
					$set: action.value
				}
			})
		}
		case actions.SET_GROUPS: {
			const {
				groups,
				userSlug
			} = action.value
			const newGroups = _.reduce(groups, (acc, group) => {
				const groupUsers = _.map(group.links['has group member'], 'slug')
				const groupSummary = {
					name: group.name,
					users: groupUsers,
					isMine: groupUsers.includes(userSlug)
				}
				acc[group.name] = groupSummary
				return acc
			}, {})
			return update(state, {
				groups: {
					$set: newGroups
				}
			})
		}
		case actions.SET_ORGS: {
			return update(state, {
				orgs: {
					$set: action.value
				}
			})
		}
		case actions.ADD_NOTIFICATION: {
			return update(state, {
				notifications: {
					$apply: (notifications) => {
						notifications.push(action.value)

						// Keep at most 2 notifications
						return notifications.slice(-2)
					}
				}
			})
		}
		case actions.REMOVE_NOTIFICATION: {
			return update(state, {
				notifications: {
					$apply: (notifications) => {
						return _.reject(notifications, {
							id: action.value
						})
					}
				}
			})
		}
		case actions.ADD_VIEW_NOTICE: {
			return update(state, {
				viewNotices: {
					[action.value.id]: {
						$set: action.value
					}
				}
			})
		}
		case actions.REMOVE_VIEW_NOTICE: {
			return update(state, {
				viewNotices: {
					$unset: [ action.value ]
				}
			})
		}
		case actions.SET_STATUS: {
			return update(state, {
				status: {
					$set: action.value
				}
			})
		}
		case actions.SET_CONFIG: {
			return update(state, {
				config: {
					$set: action.value
				}
			})
		}
		case actions.USER_STARTED_TYPING: {
			return update(state, {
				usersTyping: (usersTyping) => update(usersTyping || {}, {
					[action.value.card]: (card) => update(card || {}, {
						[action.value.user]: {
							$set: true
						}
					})
				})
			})
		}
		case actions.USER_STOPPED_TYPING: {
			return update(state, {
				usersTyping: (usersTyping) => update(usersTyping || {}, {
					[action.value.card]: (card) => update(card || {}, {
						$unset: [ action.value.user ]
					})
				})
			})
		}

		default:
			return state
	}
}

export const reducer = redux.combineReducers({
	router: connectRouter(history),
	core: coreReducer,
	ui: uiReducer,
	views: viewsReducer
})
