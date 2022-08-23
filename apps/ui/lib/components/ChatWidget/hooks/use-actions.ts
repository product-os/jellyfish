import React from 'react';
import { useStore } from 'react-redux';
import { useSetup } from '../../';
import * as actionCreators from '../store/action-creators';
import { Action } from '../store/action-types';
import { State } from '../store/reducer';

export const useActions = (): any => {
	const store = useStore<State, Action>();
	const { sdk } = useSetup()!;

	return React.useMemo(() => {
		const keys = Object.keys(actionCreators) as Array<
			keyof typeof actionCreators
		>;
		return keys.reduce((actions, method) => {
			actions[method] = actionCreators[method]({
				store,
				sdk,
			});
			return actions;
		}, {} as { [method: string]: (...args: any[]) => any });
	}, [store, sdk]);
};
