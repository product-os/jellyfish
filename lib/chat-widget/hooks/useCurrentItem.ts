import { useCallback, useMemo } from 'react';
import { ActionType } from '../state/ActionType';
import { Item } from '../state/reducer';
import { useStore } from './useStore';

export const useCurrentItem = () => {
	const {
		state: { currentItemRef, itemList },
		dispatch,
	} = useStore();

	const currentItem = useMemo(
		() =>
			(itemList &&
				itemList.records.find(record => record.id === currentItemRef)) ||
			null,
		[itemList, currentItemRef],
	);

	const setCurrentItem = useCallback(
		(item: Item | null) => {
			dispatch({
				type: ActionType.SET_CURRENT_ITEM,
				payload: item,
			});
		},
		[dispatch],
	);

	return {
		currentItem,
		setCurrentItem,
	};
};
