
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const localForage = require('localforage')
const _ = require('lodash')
const redux = require('redux')
const reduxThunk = require('redux-thunk')
const common = require('./common')
const constants = require('./constants')
const core = require('./reducers/core')
const views = require('./reducers/views')
const sdk = require('./sdk')

// Set localStorage as the backend driver, as it is a little easier to work
// with.
// In memory storage should be used as a fallback if localStorage isn't
// available for some reason. This functionality is waiting on:
// https://github.com/localForage/localForage/pull/721
localForage.setDriver(localForage.LOCALSTORAGE)
const save = (state) => {
	// Only save the core state to prevent localStorage from filling up with view data
	localForage.setItem(constants.STORAGE_KEY, {
		core: state.core
	})
}
const rootReducer = redux.combineReducers({
	core: core.core,
	views: views.views
})

const reducerWrapper = (state, action) => {
	const firstRun = !state
	let newState = null
	if (action.type === exports.actions.LOGOUT) {
		sdk.sdk.auth.logout()
		newState = common.getDefaultState()
		newState.core.status = 'unauthorized'
	} else {
		newState = rootReducer(state, action)
	}
	if (!firstRun) {
		save(newState)
	}
	return newState
}
exports.createJellyfishStore = () => {
	return redux.createStore(reducerWrapper, redux.applyMiddleware(reduxThunk.default))
}
exports.actions = _.merge({}, core.coreActions, views.viewActions)
exports.actionCreators = _.merge({}, core.coreActionCreators, views.viewActionCreators)
exports.selectors = _.merge({}, core.coreSelectors, views.viewSelectors)
