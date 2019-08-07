import { useContext } from 'react';
import { Store, StoreContext } from './useCreateStore';

export const useStore = () => {
	return useContext(StoreContext) as Store;
};
