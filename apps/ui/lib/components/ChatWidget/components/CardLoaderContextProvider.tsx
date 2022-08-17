import React from 'react';
import { CardLoaderContext } from '../../CardLoader';
import { selectCardById } from '../store/selectors';
import { useActions } from '../hooks';
import type { Contract } from 'autumndb';

export const CardLoaderContextProvider = React.memo(({ children }) => {
	const actions = useActions();

	const cardLoaderCtx = React.useMemo(() => {
		return {
			getCard: actions.getCard,
			selectCard: <TCard extends Contract>(id) => {
				return (state): TCard | null => {
					return selectCardById<TCard>(id)(state);
				};
			},
		};
	}, [actions]);

	return (
		<CardLoaderContext.Provider value={cardLoaderCtx}>
			{children}
		</CardLoaderContext.Provider>
	);
});
