import * as Bluebird from 'bluebird';
import * as localForage from 'localforage';
import * as _ from 'lodash';
import { Analytics } from '../services/analytics';
import { debug } from '../services/helpers';
import {
	setChannelsFromPath,
	setPathFromState,
} from '../services/url-manager';
import { getDefaultState } from './common';
import { STORAGE_KEY } from './constants';
import { sdk as jellyfishSdk } from './sdk';
import { actionCreators, actions, createJellyfishStore, selectors, StoreState } from './store';

const ANALYTICS_TOKEN = process.env.MIXPANEL_TOKEN_UI;

export const store = createJellyfishStore();
export const analytics = new Analytics({
	token: ANALYTICS_TOKEN,
});

const load = () => Bluebird.try(() => {
	debug('LOADING STATE FROM STORAGE');
	return localForage.getItem<StoreState>(STORAGE_KEY)

	// TODO abstract this logic to something more redux-esque
	.then((state) => {
		if (state) {
			// Remove notifications
			_.set(state, 'core.notifications', []);

			// Ensure that the stored state has a safe structure buy merging it with
			// the default state. This helps gaurd against situations where the
			// defaultstate changes or localStorage becomes corrupted.
			// Additionally, 'status' is always set back to 'initializing', so that the
			// session is re-checked on load, and the UI bootstrapping process
			// functions in the correct order
			const defaultState = getDefaultState();

			// Remove unknown top level keys from stored state
			_.forEach(_.keys(state), (key) => {
				if (!_.has(defaultState, key)) {
					delete (state as any)[key];
				}
			});

			store.dispatch({
				type: actions.SET_STATE,
				value: _.merge(defaultState.core, state.core, { status: 'initializing' }),
			});

			// load URL route
			setChannelsFromPath();

			store.subscribe(() => setPathFromState(store.getState()));
		}
	});
});

load()
	.then(() => {
		const token = selectors.getSessionToken(store.getState());
		if (token) {
			debug('FOUND STORED SESSION TOKEN, CHECKING AUTHORIZATION');
			store.dispatch(actionCreators.loginWithToken(token));
		} else {
			store.dispatch(actionCreators.setStatus('unauthorized'));
		}

		return null;
	});

(window as any).sdk = jellyfishSdk;
export const sdk = jellyfishSdk;
