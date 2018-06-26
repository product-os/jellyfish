import { getSdk } from '@resin.io/jellyfish-sdk';
import * as Bluebird from 'bluebird';
import * as localForage from 'localforage';
import * as _ from 'lodash';
import { applyMiddleware, createStore, Middleware } from 'redux';
import thunk, { ThunkAction } from 'redux-thunk';
import uuid = require('uuid/v4');
import { Card, Channel, JellyfishState, Notification, Type } from '../Types';
import { createChannel, debug } from './services/helpers';
import {
	setChannelsFromPath,
	setPathFromState,
} from './services/url-manager';

const API_PREFIX = process.env.API_PREFIX || 'api/v1';
const API_URL = process.env.API_URL || window.location.origin;
const STORAGE_KEY = 'jellyfish_store';
const NOTIFICATION_LIFETIME = 10 * 1000;

const ifNotInTestEnv = (fn: (...args: any[]) => any) => (...args: any[]) => {
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	return fn.call(fn, ...args);
};

// Set localStorage as the backend driver, as it is a little easier to work
// with.
// In memory storage should be used as a fallback if localStorage isn't
// available for some reason. This functionality is waiting on:
// https://github.com/localForage/localForage/pull/721
ifNotInTestEnv(() => localForage.setDriver(localForage.LOCALSTORAGE))();

const defaultState = (): JellyfishState => ({
	status: 'initializing',
	channels: [
		createChannel({
			target: 'view-all-views',
		}),
	],
	types: [],
	session: null,
	notifications: [],
	viewNotices: {},
	allUsers: [],
	config: {},
});

interface Action {
	type: 'string';
	value?: any;
}

const actions = {
	SET_STATUS: 'SET_STATUS',
	SET_STATE: 'SET_STATE',
	SET_TYPES: 'SET_TYPES',
	SET_ALL_USERS: 'SET_ALL_USERS',
	UPDATE_CHANNEL: 'UPDATE_CHANNEL',
	ADD_CHANNEL: 'ADD_CHANNEL',
	REMOVE_CHANNEL: 'REMOVE_CHANNEL',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	LOGOUT: 'LOGOUT',
	SET_USER: 'SET_USER',
	ADD_NOTIFICATION: 'ADD_NOTIFICATION',
	REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
	ADD_VIEW_NOTICE: 'ADD_VIEW_NOTICE',
	REMOVE_VIEW_NOTICE: 'REMOVE_VIEW_NOTICE',
	SET_CONFIG: 'SET_CONFIG',
};

type JellyThunk<T> = ThunkAction<Bluebird<T>, JellyfishState, void>;
type JellyThunkSync<T> = ThunkAction<T, JellyfishState, void>;

export const sdk = getSdk({
	apiPrefix: API_PREFIX,
	apiUrl: API_URL,
});

const logger: Middleware = (store) => (next) => (action: any) => {
	debug('DISPATCHING REDUX ACTION', action);
	const result = next(action);
	debug('NEXT REDUX STATE', store.getState());
	return result;
};

const reducer = (state: JellyfishState, action: Action) => {
	const newState = _.cloneDeep(state);
	switch (action.type) {
		case actions.LOGOUT:
			sdk.auth.logout();
			return _.assign(defaultState(), { status: 'unauthorized' });

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

		case actions.ADD_NOTIFICATION:
			newState.notifications.push(action.value);

			// Keep at most 2 notifications
			newState.notifications = newState.notifications.slice(-2);

			return newState;

		case actions.REMOVE_NOTIFICATION:
			newState.notifications = _.reject(newState.notifications, { id: action.value });

			return newState;

		case actions.ADD_VIEW_NOTICE:
			const { id, ...payload } = action.value;

			newState.viewNotices[id] = payload;

			return newState;

		case actions.REMOVE_VIEW_NOTICE:
			if (newState.viewNotices[action.value]) {
				delete newState.viewNotices[action.value];
			}

			return newState;

		case actions.SET_STATUS:
			newState.status = action.value;

			return newState;

		case actions.SET_ALL_USERS:
			newState.allUsers = _.sortBy(action.value, 'slug');

			return newState;

		case actions.SET_CONFIG:
			newState.config = action.value;

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

export const store = createStore<JellyfishState>(reducerWrapper, applyMiddleware(logger, thunk));

export const actionCreators = {
	setState: (state: JellyfishState) => ({
		type: actions.SET_STATE,
		value: state,
	}),
	loadChannelData: (channel: Channel): JellyThunkSync<void> => (dispatch) => {
		sdk.card.get(channel.data.target)
			.then((head) => {
				const clonedChannel = _.cloneDeep(channel);
				clonedChannel.data.head = head!;

				dispatch({
					type: actions.UPDATE_CHANNEL,
					value: clonedChannel,
				});
			})
			.catch((e) => {
				dispatch(actionCreators.addNotification('danger', e.message));
			});
	},
	updateChannel: (channel: Partial<Channel>) => ({
		type: actions.UPDATE_CHANNEL,
		value: channel,
	}),
	addChannel: (channel: Channel): JellyThunkSync<void> => (dispatch) => {
		dispatch({
			type: actions.ADD_CHANNEL,
			value: channel,
		});

		return dispatch(actionCreators.loadChannelData(channel));
	},
	removeChannel: (channel: Channel) => ({
		type: actions.REMOVE_CHANNEL,
		value: channel,
	}),
	bootstrap: (): JellyThunk<Card> => (dispatch) => {
		return Bluebird.all([
			sdk.auth.whoami(),
			sdk.card.getAllByType('type'),
			sdk.card.getAllByType('user'),
			sdk.getConfig(),
		])
		.then(([user, types, allUsers, config]) => {
			if (!user) {
				throw new Error('Could not retrieve user');
			}
			const state = store.getState();
			// Check to see if we're still logged in
			if (_.get(state, ['session', 'authToken'])) {
				dispatch(actionCreators.setUser(user!));
				dispatch(actionCreators.setTypes(types as Type[]));
				dispatch(actionCreators.setAllUsers(allUsers));
				dispatch({
					type: actions.SET_CONFIG,
					value: config,
				});
				state.channels.forEach((channel) => dispatch(actionCreators.loadChannelData(channel)));
			}

			return user;
		});
	},
	setAuthToken: (token: string) => ({
		type: actions.SET_AUTHTOKEN,
		value: token,
	}),
	loginWithToken: (token: string): JellyThunk<null> => (dispatch) => {
		return sdk.auth.loginWithToken(token)
			.then(() => dispatch(actionCreators.setAuthToken(token)))
			.then(() => dispatch(actionCreators.bootstrap()))
			.then(() => dispatch(actionCreators.setStatus('authorized')))
			.then(() => null)
			.catch((e) => {
				dispatch(actionCreators.setStatus('unauthorized'));
				throw e;
			});
	},
	login: (payload: { username: string, password: string }): JellyThunk<null> => (dispatch) => {
		return sdk.auth.login(payload)
			.then((session) => dispatch(actionCreators.setAuthToken(session.id)))
			.then(() => dispatch(actionCreators.bootstrap()))
			.then(() => dispatch(actionCreators.setStatus('authorized')))
			.then(() => null)
			.catch((e) => {
				dispatch(actionCreators.setStatus('unauthorized'));
				throw e;
			});
	},
	logout: () => ({
		type: actions.LOGOUT,
	}),
	signup: (payload: { username: string, email: string, password: string }): JellyThunk<any> => (dispatch) => {
		return sdk.auth.signup(payload)
		.then(() => dispatch(actionCreators.login(payload)));
	},
	setStatus: (status: JellyfishState['status']) => {
		// If the status is now 'unauthorized' just run the logout routine
		if (status === 'unauthorized') {
			return {
				type: actions.LOGOUT,
			};
		}

		return {
			type: actions.SET_STATUS,
			value: status,
		};
	},
	setUser: (user: Card) => ({
		type: actions.SET_USER,
		value: user,
	}),
	setTypes: (types: Type[]) => ({
		type: actions.SET_TYPES,
		value: types,
	}),
	addNotification: (type: Notification['type'], message: string): JellyThunk<void> =>
		(dispatch) => Bluebird.try(() => {
			const id = uuid();
			dispatch({
				type: actions.ADD_NOTIFICATION,
				value: {
					id,
					type,
					message,
					timestamp: Date.now(),
				},
			});

			setTimeout(() => {
				dispatch(actionCreators.removeNotification(id));
			}, NOTIFICATION_LIFETIME);
		}),
	removeNotification: (id: string) => ({
		type: actions.REMOVE_NOTIFICATION,
		value: id,
	}),
	addViewNotice: (payload: any) => ({
		type: actions.ADD_VIEW_NOTICE,
		value: payload,
	}),
	removeViewNotice: (id: string) => ({
		type: actions.REMOVE_VIEW_NOTICE,
		value: id,
	}),
	setAllUsers: (users: Card[]) => ({
		type: actions.SET_ALL_USERS,
		value: users,
	}),
};

const save = ifNotInTestEnv((state: JellyfishState) => {
	localForage.setItem(STORAGE_KEY, state);
});

const load = () => Bluebird.try(ifNotInTestEnv(() => {
	debug('LOADING STATE FROM STORAGE');
	return localForage.getItem<JellyfishState>(STORAGE_KEY)
	.then((state) => {
		if (state) {
			// Remove notifications
			state.notifications = [];

			store.dispatch({
				type: actions.SET_STATE,
				// Ensure that the stored state has a safe structure buy merging it with
				// the default state. This helps gaurd against situations where the
				// defaultstate changes or localStorage becomes corrupted.
				// Additionally, 'status' is always set back to 'initializing', so that the
				// session is re-checked on load, and the UI bootstrapping process
				// functions in the correct order
				value: _.merge(defaultState(), state, { status: 'initializing' }),
			});

			// load URL route
			setChannelsFromPath();
		}
	});
}));

load()
	.then(() => {
		const token = _.get(store.getState(), 'session.authToken');
		if (token) {
			debug('FOUND STORED SESSION TOKEN, CHECKING AUTHORIZATION');
			store.dispatch(actionCreators.loginWithToken(token));
		} else {
			store.dispatch(actionCreators.setStatus('unauthorized'));
		}

		return null;
	});

store.subscribe(() => setPathFromState(store.getState()));

(window as any).sdk = sdk;

