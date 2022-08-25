declare const window: Window & {
	__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
};

import {
	applyMiddleware,
	compose,
	createStore as createReduxStore,
} from 'redux';
import * as env from '../../../environment';
import thunkMiddleware from 'redux-thunk';
import { createReducer, State } from './reducer';

export const createStore = (
	initialState: State,
	{ environment }: { environment: typeof env },
) => {
	const composeEnhancers =
		typeof window !== 'undefined' &&
		!environment.isProduction() &&
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
			? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
					name: 'Jellychat',
			  })
			: compose;

	const store = createReduxStore(
		createReducer(initialState),
		composeEnhancers(applyMiddleware(thunkMiddleware)),
	);

	return store;
};
