import { useCallback } from 'react';
import * as uuid from 'uuid';
import { useCurrentItem } from '../useCurrentItem';

export const useAddNewItem = () => {
	const { setCurrentItem } = useCurrentItem();

	return useCallback(() => {
		setCurrentItem({
			id: uuid.v4(),
			conversation: null,
			messageList: null,
		});
	}, [setCurrentItem]);
};
