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
	reducer
} from './reducer'

export const createStore = () => {
	const store = createReduxStore(
		reducer,
		applyMiddleware(thunkMiddleware)
	)

	return store
}
