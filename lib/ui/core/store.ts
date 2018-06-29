import * as localForage from 'localforage';
import { applyMiddleware, combineReducers, createStore, Middleware } from 'redux';
import thunk from 'redux-thunk';
import { debug } from '../services/helpers';
import { Action, ifNotInTestEnv } from './common';
import { STORAGE_KEY } from './constants';
import { core, coreActionCreators, coreActions, coreSelectors, ICore } from './reducers/core';

export interface StoreState {
	core: ICore;
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
});

const logger: Middleware = (store) => (next) => (action: any) => {
	debug('DISPATCHING REDUX ACTION', action);
	const result = next(action);
	debug('NEXT REDUX STATE', store.getState());
	return result;
};

const reducerWrapper = (state: StoreState, action: Action) => {
	const firstRun = !state;
	const newState = rootReducer(state, action);

	if (!firstRun) {
		save(newState);
	}

	return newState;
};

export const createJellyfishStore = () =>
	createStore<StoreState>(reducerWrapper, applyMiddleware(logger, thunk));

export const actions = coreActions;
export const actionCreators = coreActionCreators;

export const selectors = coreSelectors;
