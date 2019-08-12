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
