import * as redux from 'redux';
import reduxThunk from 'redux-thunk';
import { routerMiddleware } from 'connected-react-router';
import { persistStore } from 'redux-persist';
import { isProduction } from '../../environment';
import { reducer } from './reducer';
import actions from './actions';
import { actionCreators, selectors } from './actioncreators';
import history from '../../services/history';

export const setupStore = ({ sdk, analytics, errorReporter }) => {
	const composeEnhancers =
		(typeof window !== 'undefined' &&
			!isProduction() &&
			// eslint-disable-next-line no-underscore-dangle
			(window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
		redux.compose;

	const middleware = [
		routerMiddleware(history),
		reduxThunk.withExtraArgument({
			sdk,
			analytics,
			errorReporter,
		}),
	];

	const store = redux.createStore(
		reducer,
		composeEnhancers(redux.applyMiddleware(...middleware)),
	);

	const onHydrated = async () => {
		const token = selectors.getSessionToken(store.getState());
		try {
			if (token) {
				await store.dispatch(actionCreators.loginWithToken(token) as any);
			} else {
				await store.dispatch(actionCreators.setStatus('unauthorized') as any);
			}
		} catch (error) {
			console.error(error);
		}
	};

	const persistor = persistStore(store, null, onHydrated);
	return {
		store,
		persistor,
		actions,
		actionCreators,
		selectors,
	};
};
