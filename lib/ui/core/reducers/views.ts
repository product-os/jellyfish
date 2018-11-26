import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Dispatch } from 'redux';
import { analytics } from '../';
import { JellyfishStream } from '../../../sdk';
import { Card } from '../../../types';
import { hashCode } from '../../services/helpers';
import { createNotification } from '../../services/notifications';
import { loadSchema } from '../../services/sdk-helpers';
import { Action, JellyThunkSync } from '../common';
import { sdk } from '../sdk';
import { actionCreators as allActionCreators, selectors, StoreState } from '../store';
import { coreSelectors } from './core';

const streams: { [k: string]: JellyfishStream } = {};

export interface IViews {
	viewData: { [k: string]: Card[] };
	subscriptions: { [k: string]: Card };
	activeView: string | null;
}

const findMentions = (data: Card): string[] => {
	return _.get(data, 'data.mentionsUser') || _.get(data, 'data.payload.mentionsUser', []);
};

const findAlerts = (data: Card): string[] => {
	return _.get(data, 'data.alertsUser') || _.get(data, 'data.payload.alertsUser', []);
};

const notify = (
	viewId: string,
	content: Card,
	notifyType: 'mention' | 'update' | 'alert',
	getState: () => StoreState,
) => {
	const state = getState();
	const subscription = selectors.getSubscription(state, viewId);
	const settings = _.get(subscription, ['data', 'notificationSettings', 'web' ]);

	if (!settings) {
		return;
	}

	if (!settings[notifyType]) {
		// If the notify type isn't 'update' and the user allows 'update'
		// notifications, we should notify, since a mention and an alert are
		// technically updates
		if (notifyType === 'update' || !settings.update) {
			return;
		}
	}

	createNotification('', _.get(content, 'data.payload.message'), viewId);
};

export const viewSelectors = {
	getViewData: (state: StoreState, query: string | Card | JSONSchema6) => {
		const tail = state.views.viewData[getViewId(query)];
		return tail ? tail.slice() : null;
	},
	getSubscription: (state: StoreState, id: string): Card | null =>
		state.views.subscriptions[id] || null,
};

const actions = {
	STREAM_VIEW: 'STREAM_VIEW',
	SET_VIEW_DATA: 'SET_VIEW_DATA',
	UPSERT_VIEW_DATA_ITEM: 'UPSERT_VIEW_DATA_ITEM',
	APPEND_VIEW_DATA_ITEM: 'APPEND_VIEW_DATA_ITEM',
	REMOVE_VIEW_DATA_ITEM: 'REMOVE_VIEW_DATA_ITEM',
	SAVE_SUBSCRIPTION: 'SAVE_SUBSCRIPTION',
	SET_ACTIVE_VIEW: 'SET_ACTIVE_VIEW',
};

const handleViewNotification = (
	{
		before,
		after,
	}: { before: Card | null, after: Card },
	id: string,
	dispatch: Dispatch<StoreState>,
	getState: () => StoreState,
) => {
	let mentions: string[] = [];
	let alerts: string[] = [];

	const user = selectors.getCurrentUser(getState());
	const content = after;

	// If before is non-null then a card has been updated and we need to do
	// some checking to make sure the user doesn't get spammed every time
	// a card is updated. We only check new items added to the mentions array
	if (before) {
		const beforeMentions = findMentions(before);
		const afterMentions = findMentions(after);
		mentions = _.difference(afterMentions, beforeMentions);

		const beforeAlerts = findAlerts(before);
		const afterAlerts = findAlerts(after);
		alerts = _.difference(beforeAlerts, afterAlerts);
	} else {
		mentions = findMentions(content);
		alerts = findAlerts(content);
	}

	if (_.includes(alerts, user.id)) {
		notify(id, content, 'alert', getState);
		dispatch(allActionCreators.addViewNotice({
			id,
			newMentions: true,
		}));
	} else if (_.includes(mentions, user.id)) {
		notify(id, content, 'mention', getState);
		dispatch(allActionCreators.addViewNotice({
			id,
			newMentions: true,
		}));
	} else {
		notify(id, content, 'update', getState);
		dispatch(allActionCreators.addViewNotice({
			id,
			newContent: true,
		}));
	}
};

const getViewId = (query: string | Card | JSONSchema6) => {
	if (_.isString(query)) {
		return query;
	}
	if ((query as any).id) {
		return (query as any).id;
	}
	return `${hashCode(JSON.stringify(query))}`;
};

export const actionCreators = {
	loadViewResults: (
		query: string | Card | JSONSchema6,
	): JellyThunkSync<void, StoreState> => (dispatch) => {
		loadSchema(query)
		.then((schema) => {
			if (!schema) {
				return;
			}

			return sdk.query(schema)
				.then((data) => {
					dispatch(actionCreators.setViewData(query, data));
				});
		})
			.catch((error) => {
				dispatch(allActionCreators.addNotification(
					'danger',
					error.message || error,
				));
			});
	},

	clearViewData: (
		query: string | Card | JSONSchema6,
	): Action => {
		const id = getViewId(query);

		if (streams[id]) {
			streams[id].destroy();
			delete streams[id];
		}

		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data: null,
			},
		};
	}

	streamView: (
		query: string | Card | JSONSchema6,
	): JellyThunkSync<void, StoreState> => (dispatch, getState) => {
		const viewId = getViewId(query);

		loadSchema(query)
		.then((schema) => {

			if (!schema) {
				return;
			}

			if (streams[viewId]) {
				streams[viewId].destroy();
				delete streams[viewId];
			}

			return sdk.stream(schema)
				.then((stream) => {
					streams[viewId] = stream;

					stream.on('update', (response) => {
						const { after, before } = response.data;

						handleViewNotification({ after, before }, viewId, dispatch, getState);

						// Only store view data if the view is active
						if (getState().views.activeView !== viewId) {
							return;
						}
						// If before is non-null then the card has been updated
						if (before) {
							// if after is null, the item has been removed from the result set
							if (!after) {
								return dispatch(actionCreators.removeViewDataItem(query, before));
							}

							return dispatch(actionCreators.upsertViewData(query, after));
						}

						// Otherwise, if before is null, this is a new item
						return dispatch(actionCreators.appendViewData(query, after));
					});

					stream.on('streamError', (response) => {
						console.error('Received a stream error', response.data);
					});
				});
		})
			.catch((error) => {
				dispatch(allActionCreators.addNotification(
					'danger',
					error.message || error,
				));
			});
	},

	removeViewDataItem: (query: string | Card | JSONSchema6, data: Card): Action => {
		const id = getViewId(query);
		return {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id,
				data,
			},
		};
	},

	setViewData: (query: string | Card | JSONSchema6, data: Card[]): Action => {
		const id = getViewId(query);
		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data,
			},
		};
	},

	upsertViewData: (query: string | Card | JSONSchema6, data: Card): Action => {
		const id = getViewId(query);
		return {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value: {
				id,
				data,
			},
		};
	},

	appendViewData: (query: string | Card | JSONSchema6, data: Card): Action => {
		const id = getViewId(query);
		return {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value: {
				id,
				data,
			},
		};
	},

	addSubscription: (target: string): void | JellyThunkSync<void, StoreState> => (dispatch, getState) => {
		const user = selectors.getCurrentUser(getState());
		if (!user) {
			throw new Error('Can\'t load a subscription without an active user');
		}

		sdk.query({
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: target,
						},
						actor: {
							const: user.id,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		})
		.then((results) => {
			// Check to see if the user is still logged in
			if (!coreSelectors.getSessionToken(getState())) {
				return;
			}
			Bluebird.try(() => {
				const subCard = _.first(results) || null;

				if (!subCard) {
					return sdk.card.create({
						type: 'subscription',
						data: {
							target,
							actor: user.id,
						},
					})
						.tap(() => {
							analytics.track('element.create', { element: { type: 'subscription' } });
						});
				}

				return subCard;
			})
				.tap((subCard) => {
					dispatch({
						type: actions.SAVE_SUBSCRIPTION,
						value: {
							data: subCard,
							id: target,
						},
					});
				});
		})
		.catch((error: Error) => {
			dispatch(allActionCreators.addNotification('danger', error.message));
		});
	},

	saveSubscription: (subscription: Card, target: string) => {
		sdk.card.update(subscription.id, subscription);

		return {
			type: actions.SAVE_SUBSCRIPTION,
			value: {
				data: subscription,
				id: target,
			},
		};
	},

	setActiveView: (id: string) => {
		return {
			type: actions.SET_ACTIVE_VIEW,
			value: id,
		};
	},
};

export const views = (state: IViews, action: Action) => {
	if (!state) {
		return {
			subscriptions: {},
			viewData: {},
		};
	}

	switch (action.type) {
		case actions.SET_VIEW_DATA:
			state.viewData[action.value.id] = action.value.data;

			return state;

		case actions.REMOVE_VIEW_DATA_ITEM:
			state.viewData[action.value.id] = state.viewData[action.value.id].filter((item) => {
				return item.id !== action.value.data.id;
			});

			return state;

		case actions.UPSERT_VIEW_DATA_ITEM:
			let upsertTarget = state.viewData[action.value.id];

			const update = action.value.data;

			if (upsertTarget) {
				const index = _.findIndex(upsertTarget, { id: update.id });
				upsertTarget.splice(index, 1, update);
			} else {
				upsertTarget = [ update ];
			}

			state.viewData[action.value.id] = upsertTarget.slice();

			return state;

		case actions.APPEND_VIEW_DATA_ITEM:
			let appendTarget = state.viewData[action.value.id];

			if (appendTarget) {
				appendTarget.push(action.value.data);
			} else {
				appendTarget = [ action.value.data ];
			}

			state.viewData[action.value.id] = appendTarget.slice();

			return state;

		case actions.SAVE_SUBSCRIPTION:
			state.subscriptions[action.value.id] = action.value.data;

			return state;


		case actions.SET_ACTIVE_VIEW:
			state.activeView = action.value;

			return state;

		default:
			return state;
	}
};

export const viewActions = actions;
export const viewActionCreators = actionCreators;
