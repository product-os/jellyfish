import * as React from 'react';
import { StoreContext, useCreateStore } from '../../hooks/useCreateStore';

interface StoreProviderProps {
	token: string;
	apiUrl: string;
}

export const StoreProvider: React.FunctionComponent<StoreProviderProps> = ({
	token,
	apiUrl,
	children,
}) => {
	const store = useCreateStore({ token, apiUrl });

	return (
		<StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	);
};
