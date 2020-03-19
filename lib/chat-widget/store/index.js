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
	isProduction
} from '../environment'
import {
	createReducer
} from './reducer'

const composeEnhancers =
	typeof window !== 'undefined' &&
	!isProduction() &&
	window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
		? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
			name: 'Jellychat'
		}) : compose

export const createStore = (initialState) => {
	const store = createReduxStore(
		createReducer(initialState),
		composeEnhancers(applyMiddleware(thunkMiddleware))
	)

	return store
}
