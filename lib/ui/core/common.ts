import * as Bluebird from 'bluebird';
import { ThunkAction } from 'redux-thunk';
import { createChannel } from '../services/helpers';
import { StoreState } from './store';

export interface Action {
	type: string;
	value?: any;
}

export type JellyThunk<T, S> = ThunkAction<Bluebird<T>, S, void>;
export type JellyThunkSync<T, S> = ThunkAction<T, S, void>;

export const getDefaultState = (): StoreState => ({
	core: {
		status: 'initializing',
		channels: [
			createChannel({
				target: 'view-all-views',
				cardType: 'view',
			}),
		],
		types: [],
		session: null,
		notifications: [],
		viewNotices: {},
		allUsers: [],
		accounts: [],
		orgs: [],
		config: {},
		ui: {
			sidebar: {
				expanded: [],
			},
		},
	},
	views: {
		viewData: {},
		subscriptions: {},
		activeView: null,
	},
});
