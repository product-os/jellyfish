import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as skhema from 'skhema';
import { analytics } from '../';
import { Card } from '../../../types';
import { hashCode } from '../../services/helpers';
import { loadSchema } from '../../services/sdk-helpers';
import { Action, JellyThunkSync } from '../common';
import { sdk } from '../sdk';
import { actionCreators as allActionCreators, selectors, StoreState } from '../store';
import { coreSelectors, subscribeToCoreFeed } from './core';

const streams: {
	[k: string]: {
		close: () => void;
	}
} = {};

export interface IViews {
	viewData: { [k: string]: Card[] };
	subscriptions: { [k: string]: Card };
	activeView: string | null;
}

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

const getViewId = (query: string | Card | JSONSchema6) => {
	if (_.isString(query)) {
		return query;
	}
	if ((query as any).id) {
		return (query as any).id;
	}
	return `${hashCode(JSON.stringify(query))}`;
};

const pendingLoadRequests: { [key: string]: number } = {};

interface LoadViewOptions {
	page: number;
	limit: number;
	sortBy: string | string[];
	sortDir: 'asc' | 'desc';
}

export const actionCreators = {
	loadViewResults: (
		query: string | Card | JSONSchema6,
		options: LoadViewOptions,
	): JellyThunkSync<void, StoreState> => function loadViewResults(dispatch): void {
		const id = getViewId(query);
		const requestTimestamp = Date.now();

		pendingLoadRequests[id] = requestTimestamp;

		loadSchema(query)
		.then((schema) => {
			if (!schema) {
				return;
			}

			return sdk.query(schema, {
				limit: options.limit,
				skip: options.limit * options.page,
				sortBy: options.sortBy,
				sortDir: options.sortDir,
			})
				.then((data) => {
					// Only update the store if this request is still the most recent once
					if (pendingLoadRequests[id] === requestTimestamp) {
						if (options.page === 0) {
							dispatch(actionCreators.setViewData(query, data));
						} else {
							dispatch(actionCreators.appendViewData(query, data));
						}
					}
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
			streams[id].close();
			delete streams[id];
		}

		return {
			type: actions.SET_VIEW_DATA,
			value: {
				id,
				data: null,
			},
		};
	},

	streamView: (
		query: string | Card | JSONSchema6,
	): JellyThunkSync<void, StoreState> => function streamView(dispatch, getState): any {
		const viewId = getViewId(query);

		return loadSchema(query)
		.then((schema) => {

			if (!schema) {
				return;
			}

			if (streams[viewId]) {
				streams[viewId].close();
				delete streams[viewId];
			}

			streams[viewId] = subscribeToCoreFeed('update', (response) => {
				const { after, before } = response.data;

				const afterValid = after && skhema.isValid(schema, after);
				const beforeValid = before && skhema.isValid(schema, before);

				// Only store view data if the view is active
				if (getState().views.activeView !== viewId) {
					return;
				}
				// If before is non-null then the card has been updated
				if (beforeValid) {
					// if after is null, the item has been removed from the result set
					if (!after || !afterValid) {
						return dispatch(actionCreators.removeViewDataItem(query, before));
					}

					return dispatch(actionCreators.upsertViewData(query, after));
				}

				if (!before && afterValid) {
					// Otherwise, if before is null, this is a new item
					return dispatch(actionCreators.appendViewData(query, after));
				}
			});
		})
			.catch((error) => {
				dispatch(allActionCreators.addNotification(
					'danger',
					error.message || error,
				));
			});
	},

	setDefault: (
		card: Card,
	): JellyThunkSync<void, StoreState> => function setDefault(dispatch, getState): void {
		const user = selectors.getCurrentUser(getState());
		sdk.card.update(user.id, {
			type: 'user',
			data: {
				profile: {
					homeView: card.id,
				},
			},
		})
			.then(() => {
				dispatch(allActionCreators.addNotification(
					'success',
					`Set ${card.name || card.slug} as default view`,
				));
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

	appendViewData: (query: string | Card | JSONSchema6, data: Card | Card[]): Action => {
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
			const appendTarget = state.viewData[action.value.id] || [];

			if (_.isArray(action.value.data)) {
				appendTarget.push(...action.value.data);
			} else {
				appendTarget.push(action.value.data);
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
