import React from 'react';
import { CardLoaderContext } from '@balena/jellyfish-ui-components';
import { selectCardById } from '../store/selectors';
import { useActions } from '../hooks';
import type { Contract } from '@balena/jellyfish-types/build/core';

export const CardLoaderContextProvider = React.memo(({ children }) => {
	const actions = useActions();

	const cardLoaderCtx = React.useMemo(() => {
		return {
			getCard: actions.getCard,
			selectCard: <TCard extends Contract>(id) => {
				return (state): TCard => {
					return selectCardById<TCard>(id)(state)!;
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
