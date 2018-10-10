import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { Dispatch } from 'redux';
import uuid = require('uuid/v4');
import { analytics } from '../';
import { AppStatus, Card, Channel, Notification, Type, ViewNotice } from '../../../Types';
import { Action, getDefaultState, JellyThunk, JellyThunkSync } from '../common';
import { sdk } from '../sdk';

const NOTIFICATION_LIFETIME = 10 * 1000;

export interface ICore {
	status: AppStatus;
	channels: Channel[];
	types: Type[];
	allUsers: Card[];
	session: null | {
		authToken: string | null;
		user?: Card;
	};
	notifications: Notification[];
	viewNotices: {
		[k: string]: ViewNotice;
	};
	config: {
		version?: string;
		changelog?: string;
	};
}

interface KnownState {
	core: ICore;
	[k: string]: any;
}

export const coreSelectors = {
	getAllUsers: (state: KnownState) => state.core.allUsers,
	getAppVersion: (state: KnownState) => _.get(state.core, ['config', 'version']) || null,
	getChangelog: (state: KnownState) => _.get(state.core, ['config', 'changelog']) || null,
	getChannels: (state: KnownState) => state.core.channels,
	getCurrentUser: (state: KnownState) => _.get(state.core, ['session', 'user']) || null,
	getNotifications: (state: KnownState) => state.core.notifications || [],
	getSessionToken: (state: KnownState) => _.get(state.core, ['session', 'authToken']) || null,
	getStatus: (state: KnownState) => state.core.status,
	getTypes: (state: KnownState) => state.core.types,
	getViewNotices: (state: KnownState) => state.core.viewNotices,
};

const actions = {
	SET_STATUS: 'SET_STATUS',
	SET_STATE: 'SET_STATE',
	SET_TYPES: 'SET_TYPES',
	SET_ALL_USERS: 'SET_ALL_USERS',
	UPDATE_CHANNEL: 'UPDATE_CHANNEL',
	ADD_CHANNEL: 'ADD_CHANNEL',
	REMOVE_CHANNEL: 'REMOVE_CHANNEL',
	SET_CHANNELS: 'SET_CHANNELS',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	LOGOUT: 'LOGOUT',
	SET_USER: 'SET_USER',
	ADD_NOTIFICATION: 'ADD_NOTIFICATION',
	REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
	ADD_VIEW_NOTICE: 'ADD_VIEW_NOTICE',
	REMOVE_VIEW_NOTICE: 'REMOVE_VIEW_NOTICE',
	SET_CONFIG: 'SET_CONFIG',
};

export const actionCreators = {
	setState: (state: ICore) => ({
		type: actions.SET_STATE,
		value: state,
	}),

	loadChannelData: (channel: Channel): JellyThunkSync<void, KnownState> => (dispatch) => {
		return sdk.card.get(channel.data.target)
			.then((head) => {
				if (!head) {
					return;
				}
				const clonedChannel = _.cloneDeep(channel);
				clonedChannel.data.head = head;

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

	addChannel: (channel: Channel): JellyThunkSync<void, KnownState> => (dispatch) => {
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

	setChannels: (channels: Channel[]) => ({
		type: actions.SET_CHANNELS,
		value: channels,
	}),

	bootstrap: (): JellyThunk<Card, KnownState> => (dispatch, getState) => {
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
			const state = getState();
			// Check to see if we're still logged in
			if (coreSelectors.getSessionToken(state)) {
				dispatch(actionCreators.setUser(user!));
				dispatch(actionCreators.setTypes(types as Type[]));
				dispatch(actionCreators.setAllUsers(allUsers));
				dispatch({
					type: actions.SET_CONFIG,
					value: config,
				});
				const channels = coreSelectors.getChannels(state);
				channels.forEach((channel) => dispatch(actionCreators.loadChannelData(channel)));
			}

			return user;
		});
	},

	setAuthToken: (token: string) => ({
		type: actions.SET_AUTHTOKEN,
		value: token,
	}),

	loginWithToken: (token: string): JellyThunk<void, KnownState> => (dispatch, getState) => {
		return sdk.auth.loginWithToken(token)
			.then(() => dispatch(actionCreators.setAuthToken(token)))
			.then(() => dispatch(actionCreators.bootstrap()))
			.then(() => dispatch(actionCreators.setStatus('authorized')))
			.then(() => {
				analytics.track('ui.loginWithToken');
				analytics.identify(coreSelectors.getCurrentUser(getState()).id);
			})
			.catch((e) => {
				dispatch(actionCreators.setStatus('unauthorized'));
				throw e;
			});
	},

	login: (payload: {
		username: string,
		password: string
	}): JellyThunk<void, KnownState> => (dispatch, getState) => {
		return sdk.auth.login(payload)
			.then((session) => dispatch(actionCreators.setAuthToken(session.id)))
			.then(() => dispatch(actionCreators.bootstrap()))
			.then(() => dispatch(actionCreators.setStatus('authorized')))
			.then(() => {
				analytics.track('ui.login');
				analytics.identify(coreSelectors.getCurrentUser(getState()).id);
			})
			.catch((e) => {
				dispatch(actionCreators.setStatus('unauthorized'));
				throw e;
			});
	},

	logout: () => {
		analytics.track('ui.logout');
		analytics.identify();

		return {
			type: actions.LOGOUT,
		};
	},

	signup: (payload: {
		username: string,
		email: string,
		password: string
	}): JellyThunk<any, KnownState> => (dispatch) => {
		return sdk.auth.signup(payload)
		.then(() => {
			analytics.track('ui.signup');
			dispatch(actionCreators.login(payload));
		});
	},

	setStatus: (status: ICore['status']) => {
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

	addNotification: (
		type: Notification['type'],
		message: string,
	): JellyThunk<void, KnownState> => {
		if (process.env.NODE_ENV === 'test' && type === 'danger') {
			console.warn('An error notification was triggered in a test environment', message);
		}

		return (dispatch: Dispatch<ICore>) => Bluebird.try(() => {
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
		});
	},

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

export const core = (state: ICore, action: Action) => {
	if (!state) {
		return getDefaultState().core;
	}

	const newState = _.cloneDeep(state);
	switch (action.type) {
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

		case actions.SET_CHANNELS:
			newState.channels = action.value;

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

export const coreActions = actions;
export const coreActionCreators = actionCreators;
