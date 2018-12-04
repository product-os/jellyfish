import * as localForage from 'localforage';
import * as _ from 'lodash';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import { Action, getDefaultState, ifNotInTestEnv } from './common';
import { STORAGE_KEY } from './constants';
import {
	core,
	coreActionCreators,
	coreActions,
	coreSelectors,
	ICore
} from './reducers/core';
import {
	IViews,
	viewActionCreators,
	viewActions,
	views,
	viewSelectors,
} from './reducers/views';
import { sdk } from './sdk';

export interface StoreState {
	core: ICore;
	views: IViews;
}

// Set localStorage as the backend driver, as it is a little easier to work
// with.
// In memory storage should be used as a fallback if localStorage isn't
// available for some reason. This functionality is waiting on:
// https://github.com/localForage/localForage/pull/721
ifNotInTestEnv(() => localForage.setDriver(localForage.LOCALSTORAGE))();

const save = ifNotInTestEnv((state: StoreState) => {
	localForage.setItem(STORAGE_KEY, state);
});

const rootReducer = combineReducers<StoreState>({
	core,
	views,
});

const reducerWrapper = (state: StoreState, action: Action) => {
	const firstRun = !state;

	let newState;

	if (action.type === actions.LOGOUT) {
		sdk.auth.logout();
		newState = getDefaultState();
		newState.core.status = 'unauthorized';
	} else {
		newState = rootReducer(state, action);
	}

	if (!firstRun) {
		save(newState);
	}

	return newState;
};

export const createJellyfishStore = () =>
	createStore<StoreState>(reducerWrapper, applyMiddleware(thunk));

export const actions = _.merge({},
	coreActions,
	viewActions,
);
export const actionCreators = _.merge({},
	coreActionCreators,
	viewActionCreators,
);

export const selectors = _.merge({},
	coreSelectors,
	viewSelectors,
);
