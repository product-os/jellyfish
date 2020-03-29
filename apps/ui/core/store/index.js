/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import localForage from 'localforage'
import * as redux from 'redux'
import reduxThunk from 'redux-thunk'
import _ from 'lodash'
import {
	isProduction
} from '../../environment'
import {
	reducer
} from './reducer'
import actions from './actions'
import ActionCreator, {
	selectors
} from './actioncreators'

// Set localStorage as the backend driver, as it is a little easier to work
// with.
// In memory storage should be used as a fallback if localStorage isn't
// available for some reason. This functionality is waiting on:
// https://github.com/localForage/localForage/pull/721
localForage.setDriver(localForage.LOCALSTORAGE)

export const setupStore = ({
	sdk,
	analytics,
	storageKey
}) => {
	const save = (state) => {
		// Only save the core state to prevent localStorage from filling up with view data
		// Don't save cached (user) cards - these should be refetched to ensure we have
		// the latest version
		localForage.setItem(storageKey, {
			core: _.omit(state.core, [ 'cards', 'ui.flows' ])
		})
	}

	const reducerWrapper = (state, action) => {
		const firstRun = !state
		const newState = reducer(state, action)
		if (!firstRun) {
			save(newState)
		}
		return newState
	}

	const composeEnhancers = (
		typeof window !== 'undefined' &&
		!isProduction() &&
		// eslint-disable-next-line no-underscore-dangle
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
	) || redux.compose

	return {
		store: redux.createStore(reducerWrapper, composeEnhancers(redux.applyMiddleware(reduxThunk))),
		actions,
		actionCreators: new ActionCreator({
			sdk,
			analytics,
			selectors
		}),
		selectors
	}
}
