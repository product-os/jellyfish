import { useCallback } from 'react';
import { ActionType } from '../state/ActionType';
import { LoadingState } from '../state/reducer';
import { useStore } from './useStore';

export const useLoading = () => {
	const { state, dispatch } = useStore();

	const setLoading = useCallback(
		(key: string, config: LoadingState[typeof key]) => {
			dispatch({
				type: ActionType.SET_LOADING,
				payload: { [key]: config },
			});
		},
		[dispatch],
	);

	return {
		loading: state.loading,
		setLoading,
	};
};
