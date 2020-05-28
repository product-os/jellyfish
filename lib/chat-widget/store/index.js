/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */

import {
	applyMiddleware,
	compose,
	createStore as createReduxStore
} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {
	createReducer
} from './reducer'

export const createStore = (initialState, {
	environment
}) => {
	const composeEnhancers =
		typeof window !== 'undefined' &&
		!environment.isProduction() &&
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
			? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
				name: 'Jellychat'
			}) : compose

	const store = createReduxStore(
		createReducer(initialState),
		composeEnhancers(applyMiddleware(thunkMiddleware))
	)

	return store
}
