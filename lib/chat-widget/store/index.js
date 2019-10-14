/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	applyMiddleware, createStore as createReduxStore
} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {
	createReducer
} from './reducer'

export const createStore = (initialState) => {
	const store = createReduxStore(
		createReducer(initialState),
		applyMiddleware(thunkMiddleware)
	)

	return store
}
