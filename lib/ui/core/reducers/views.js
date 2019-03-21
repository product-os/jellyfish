/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const skhema = require('skhema')
const {
	analytics
} = require('../')
const helpers = require('../../services/helpers')
const sdkHelpers = require('../../services/sdk-helpers')
const {
	sdk
} = require('../sdk')
const store = require('../store')
const core = require('./core')
const streams = {}

exports.viewSelectors = {
	getViewData: (state, query) => {
		const tail = state.views.viewData[getViewId(query)]
		return tail ? tail.slice() : null
	},
	getSubscription: (state, id) => { return state.views.subscriptions[id] || null }
}

const actions = {
	STREAM_VIEW: 'STREAM_VIEW',
	SET_VIEW_DATA: 'SET_VIEW_DATA',
	UPSERT_VIEW_DATA_ITEM: 'UPSERT_VIEW_DATA_ITEM',
	APPEND_VIEW_DATA_ITEM: 'APPEND_VIEW_DATA_ITEM',
	REMOVE_VIEW_DATA_ITEM: 'REMOVE_VIEW_DATA_ITEM',
	SAVE_SUBSCRIPTION: 'SAVE_SUBSCRIPTION'
}

const getViewId = (query) => {
	if (_.isString(query)) {
		return query
	}
	if (query.id) {
		return query.id
	}
	return `${helpers.hashCode(JSON.stringify(query))}`
}

const pendingLoadRequests = {}

const getCardWithLinks = async (schema, card) => {
	// The updated card may not have attached links, so get them now
	if (schema.$$links) {
		return _.first(await sdk.query({
			$$links: schema.$$links,
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

const POLL_TIMEOUT = 1000 * 30

exports.actionCreators = {
	loadViewResults: (query, options) => {
		return async function (dispatch) {
			const id = getViewId(query)
			const requestTimestamp = Date.now()
			pendingLoadRequests[id] = requestTimestamp

			try {
				const schema = await sdkHelpers.loadSchema(query)
				if (!schema) {
					return
				}

				const data = await sdk.query(schema, {
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
						const pollResult = await sdk.query(schema, {
							limit: options.limit * (options.page + 1),
							skip: 0,
							sortBy: options.sortBy,
							sortDir: options.sortDir
						})
						if (pendingLoadRequests[id] === requestTimestamp) {
							dispatch(exports.actionCreators.setViewData(query, pollResult))
							poll()
						}
					}, POLL_TIMEOUT)
				}

				// Only update the store if this request is still the most recent once
				if (pendingLoadRequests[id] === requestTimestamp) {
					poll()
					if (options.page === 0) {
						dispatch(exports.actionCreators.setViewData(query, data))
					} else {
						dispatch(exports.actionCreators.appendViewData(query, data))
					}
				}

				// eslint-disable-next-line consistent-return
				return data
			} catch (error) {
				dispatch(store.actionCreators.addNotification('danger', error.message || error))
			}
		}
	},
	clearViewData: (query) => {
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
	},
	streamView: (query) => {
		return function (dispatch, getState) {
			const viewId = getViewId(query)
			return sdkHelpers.loadSchema(query)
				.then((schema) => {
					if (!schema) {
						return
					}
					if (streams[viewId]) {
						streams[viewId].close()
						Reflect.deleteProperty(streams, viewId)
					}
					streams[viewId] = core.subscribeToCoreFeed(
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
									return dispatch(exports.actionCreators.removeViewDataItem(query, before))
								}

								const card = await getCardWithLinks(schema, after)

								if (!card) {
									return
								}

								return dispatch(exports.actionCreators.upsertViewData(query, card))
							}
							if (!before && afterValid) {
								// Otherwise, if before is null, this is a new item
								const card = await getCardWithLinks(schema, after)

								if (!card) {
									return
								}

								return dispatch(exports.actionCreators.appendViewData(query, card))
							}
						}
					)
				})
				.catch((error) => {
					dispatch(store.actionCreators.addNotification('danger', error.message || error))
				})
		}
	},
	setDefault: (card) => {
		return function (dispatch, getState) {
			const user = store.selectors.getCurrentUser(getState())
			sdk.card.update(user.id, {
				type: 'user',
				data: {
					profile: {
						homeView: card.id
					}
				}
			})
				.then(() => {
					dispatch(store.actionCreators.addNotification('success', `Set ${card.name || card.slug} as default view`))
				})
				.catch((error) => {
					dispatch(store.actionCreators.addNotification('danger', error.message || error))
				})
		}
	},
	removeViewDataItem: (query, data) => {
		const id = getViewId(query)
		return {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	},
	setViewData: (query, data) => {
		const id = getViewId(query)
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data
			}
		}
	},
	upsertViewData: (query, data) => {
		const id = getViewId(query)
		return {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	},
	appendViewData: (query, data) => {
		const id = getViewId(query)
		return {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value: {
				id,
				data
			}
		}
	},
	addSubscription: (target) => {
		return (dispatch, getState) => {
			const user = store.selectors.getCurrentUser(getState())
			if (!user) {
				throw new Error('Can\'t load a subscription without an active user')
			}
			sdk.query({
				type: 'object',
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
					if (!core.coreSelectors.getSessionToken(getState())) {
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
					dispatch(store.actionCreators.addNotification('danger', error.message))
				})
		}
	},
	saveSubscription: (subscription, target) => {
		sdk.card.update(subscription.id, subscription)
		return {
			type: actions.SAVE_SUBSCRIPTION,
			value: {
				data: subscription,
				id: target
			}
		}
	}
}
exports.views = (state, action) => {
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
			state.viewData[action.value.id] = state.viewData[action.value.id].filter((item) => {
				return item.id !== action.value.data.id
			})
			return state
		}
		case actions.UPSERT_VIEW_DATA_ITEM: {
			let upsertTarget = state.viewData[action.value.id]
			const update = action.value.data
			if (upsertTarget) {
				const index = _.findIndex(upsertTarget, {
					id: update.id
				})
				upsertTarget.splice(index, 1, update)
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
exports.viewActions = actions
exports.viewActionCreators = exports.actionCreators
