import * as localForage from 'localforage';
import * as _ from 'lodash';
import { applyMiddleware, createStore, Middleware } from 'redux';
import { Card, Channel, JellyfishState, Type } from '../../Types';
import { createChannel, debug } from '../services/helpers';

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
	TRIM_CHANNELS: 'TRIM_CHANNELS',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	LOGOUT: 'LOGOUT',
	SET_USER: 'SET_USER',
};

export const actionCreators = {
	updateChannel: (channel: Partial<Channel>) => ({
		type: actions.UPDATE_CHANNEL,
		value: channel,
	}),
	addChannel: (channel: Channel) => ({
		type: actions.ADD_CHANNEL,
		value: channel,
	}),
	trimChannels: (length: number) => ({
		type: actions.TRIM_CHANNELS,
		value: length,
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

const logger: Middleware = (store) => (next) => (action) => {
	debug('DISPATCHING REDUX ACTION', action);
	const result = next(action);
	debug('NEXT REDUX STATE', store.getState());
	return result;
};

const defaultState = (): JellyfishState => ({
	channels: [
		createChannel({
			card: 'view-all-views',
			type: 'view',
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
			newState.channels.push(action.value);

			return newState;

		case actions.TRIM_CHANNELS:
			newState.channels = _.take(newState.channels, action.value);

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

const store = createStore<JellyfishState>(reducerWrapper, applyMiddleware(logger));

load();

export default store;
