import { JellyfishStream } from '@resin.io/jellyfish-sdk/dist/stream';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../../../Types';
import { hashCode } from '../../services/helpers';
import { loadSchema } from '../../services/sdk-helpers';
import { Action, JellyThunkSync } from '../common';
import { sdk } from '../sdk';

const streams: { [k: string]: JellyfishStream } = {};

export interface IViews {
	viewData: { [k: string]: Card[] };
}

interface KnownState {
	views: IViews;
}

export const viewSelectors = {
	getViewData: (state: KnownState, query: string | Card | JSONSchema6) =>
		state.views.viewData[getViewId(query)] || null,
};

const actions = {
	STREAM_VIEW: 'STREAM_VIEW',
	SET_VIEW_DATA: 'SET_VIEW_DATA',
	UPSERT_VIEW_DATA: 'UPSERT_VIEW_DATA',
	APPEND_VIEW_DATA: 'APPEND_VIEW_DATA',
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
	streamView: (
		query: string | Card | JSONSchema6,
	): JellyThunkSync<void, KnownState> => (dispatch) => {
		const viewId = getViewId(query);

		if (streams[viewId]) {
			streams[viewId].destroy();
			delete streams[viewId];
		}

		loadSchema(query)
		.then((schema) => {

			if (!schema) {
				return;
			}

			sdk.query(schema)
				.then((data) => {
					dispatch(actionCreators.setViewData(query, data));
				});

			const stream = sdk.stream(schema);
			streams[viewId] = stream;

			stream.on('update', (response) => {
				const { after, before } = response.data;
				// If before is non-null then the card has been updated
				if (before) {
					return dispatch(actionCreators.upsertViewData(query, before));
				}

				return dispatch(actionCreators.appendViewData(query, after));
			});

			stream.on('streamError', (response) => {
				console.error('Received a stream error', response.data);
			});
		});
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
			type: actions.UPSERT_VIEW_DATA,
			value: {
				id,
				data,
			},
		};
	},

	appendViewData: (query: string | Card | JSONSchema6, data: Card): Action => {
		const id = getViewId(query);
		return {
			type: actions.APPEND_VIEW_DATA,
			value: {
				id,
				data,
			},
		};
	},
};

export const views = (state: IViews, action: Action) => {
	if (!state) {
		return {
			streams: {},
			viewData: {},
		};
	}

	state = _.cloneDeep(state);

	switch (action.type) {
		case actions.SET_VIEW_DATA:
			state.viewData[action.value.id] = action.value.data;

			return state;

		case actions.UPSERT_VIEW_DATA:
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

		case actions.APPEND_VIEW_DATA:
			let appendTarget = state.viewData[action.value.id];

			if (appendTarget) {
				appendTarget.push(action.value.data);
			} else {
				appendTarget = [ action.value.data ];
			}

			state.viewData[action.value.id] = appendTarget.slice();

			return state;

		default:
			return state;
	}
};

export const viewActions = actions;
export const viewActionCreators = actionCreators;
