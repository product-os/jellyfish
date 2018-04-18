import * as localForage from 'localforage';
import * as _ from 'lodash';
import { applyMiddleware, createStore, Middleware } from 'redux';
import thunk, { ThunkAction } from 'redux-thunk';
import { Card, Channel, JellyfishState, Type } from '../../Types';
import { createChannel, debug } from './helpers';
import * as sdk from './sdk';
import {
	setChannelsFromPath,
	setPathFromState,
} from './url-manager';

// Set localStorage as the backend driver, as it is a little easier to work
// with.
localForage.setDriver(localForage.LOCALSTORAGE);

interface Action {
	type: 'string';
	value?: any;
}

const STORAGE_KEY = 'jellyfish_store';

const actions = {
	SET_STATE: 'SET_STATE',
	SET_TYPES: 'SET_TYPES',
	UPDATE_CHANNEL: 'UPDATE_CHANNEL',
	ADD_CHANNEL: 'ADD_CHANNEL',
	REMOVE_CHANNEL: 'REMOVE_CHANNEL',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	LOGOUT: 'LOGOUT',
	SET_USER: 'SET_USER',
};

type JellyThunk = ThunkAction<void, JellyfishState, void>;

export const actionCreators = {
	setState: (state: JellyfishState) => ({
		type: actions.SET_STATE,
		value: state,
	}),
	loadChannelData: (channel: Channel): JellyThunk => (dispatch) => {
		sdk.card.get(channel.data.target)
		.then((head) => {
			const clonedChannel = _.cloneDeep(channel);
			clonedChannel.data.head = head!;

			dispatch({
				type: actions.UPDATE_CHANNEL,
				value: clonedChannel,
			});
		});
	},
	updateChannel: (channel: Partial<Channel>) => ({
		type: actions.UPDATE_CHANNEL,
		value: channel,
	}),
	addChannel: (channel: Channel) => ({
		type: actions.ADD_CHANNEL,
		value: channel,
	}),
	removeChannel: (channel: Channel) => ({
		type: actions.REMOVE_CHANNEL,
		value: channel,
	}),
	setAuthToken: (token: string) => ({
		type: actions.SET_AUTHTOKEN,
		value: token,
	}),
	logout: () => ({
		type: actions.LOGOUT,
	}),
	setUser: (user: Card) => ({
		type: actions.SET_USER,
		value: user,
	}),
	setTypes: (types: Type[]) => ({
		type: actions.SET_TYPES,
		value: types,
	}),
};

const logger: Middleware = (store) => (next) => (action: any) => {
	debug('DISPATCHING REDUX ACTION', action);
	const result = next(action);
	debug('NEXT REDUX STATE', store.getState());
	return result;
};

const defaultState = (): JellyfishState => ({
	channels: [
		createChannel({
			target: 'view-all-views',
		}),
	],
	types: [],
	session: null,
});

const save = (state: JellyfishState) => {
	localForage.setItem(STORAGE_KEY, state);
};

const load = () => {
	localForage.getItem<JellyfishState>(STORAGE_KEY)
	.then((state) => {
		if (state) {
			store.dispatch({
				type: actions.SET_STATE,
				value: state,
			});

			// load URL route
			setChannelsFromPath();
		}
	});
};

const reducer = (state: JellyfishState, action: Action) => {
	const newState = _.cloneDeep(state);
	switch (action.type) {
		case actions.LOGOUT:
			return defaultState();

		case actions.SET_STATE:
			return action.value;

		case actions.UPDATE_CHANNEL:
			const existingChannel = _.find(newState.channels, { id: action.value.id });
			if (existingChannel) {
				_.assign(existingChannel, action.value);
			}
			return newState;

		case actions.ADD_CHANNEL:
			if (action.value.data.parentChannel) {
				// if the triggering channel is not the last channel, remove trailing
				// channels. This creates a 'breadcrumb' effect when navigating channels
				const triggerIndex = _.findIndex(newState.channels, { id: action.value.data.parentChannel });
				if (triggerIndex > -1) {
					const shouldTrim = triggerIndex + 1 < newState.channels.length;
					if (shouldTrim) {
						newState.channels = _.take(newState.channels, triggerIndex + 1);
					}
				}
			}

			newState.channels.push(action.value);

			return newState;

		case actions.REMOVE_CHANNEL:
			_.remove(newState.channels, { id: action.value.id });

			return newState;

		case actions.SET_AUTHTOKEN:
			if (newState.session) {
				newState.session.authToken = action.value;
			} else {
				newState.session = {
					authToken: action.value,
				};
			}

			return newState;

		case actions.SET_USER:
			if (!newState.session) {
				newState.session = {
					authToken: null,
				};
			}
			newState.session.user = action.value;

			return newState;

		case actions.SET_TYPES:
			newState.types = action.value;

			return newState;

		default:
			return newState;
	}
};

const reducerWrapper = (state: JellyfishState, action: Action) => {
	if (!state) {
		return defaultState();
	}

	const newState = reducer(state, action);

	save(newState);

	return newState;
};

const store = createStore<JellyfishState>(reducerWrapper, applyMiddleware(logger, thunk));

load();

store.subscribe(() => setPathFromState(store.getState()));

export default store;
