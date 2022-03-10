import React from 'react';
import type { Contract } from '@balena/jellyfish-types/build/core';
import type { Operation } from 'fast-json-patch';
import { useSetup } from '../SetupProvider';
import { addNotification } from '../../services/notifications';

type UpdateCardHandler = (card: Contract, patch: Operation[]) => Promise<any>;

interface WithCardUpdaterProps {
	actions: any;
	onUpdateCard: UpdateCardHandler;
}

export default function withCardUpdater<
	TProps extends Omit<WithCardUpdaterProps, 'onUpdateCard'>,
>(skipNotification = false) {
	return (
		BaseComponent: React.ComponentType<TProps & WithCardUpdaterProps>,
	) => {
		return (props: React.PropsWithChildren<TProps>) => {
			const { sdk, analytics } = useSetup()!;
			const onUpdateCard: UpdateCardHandler = async (card, patch) => {
				if (patch.length) {
					return sdk.card
						.update(card.id, card.type, patch)
						.then((response) => {
							analytics.track('element.update', {
								element: {
									id: card.id,
									type: card.type,
								},
							});
							return response;
						})
						.then((response) => {
							if (!skipNotification) {
								addNotification('success', `Updated ${card.name || card.slug}`);
							}
							return response;
						})
						.catch((error) => {
							console.log(error, error.message);
							addNotification('danger', error.message || error);
						});
				}
				return null;
			};
			return <BaseComponent {...props} onUpdateCard={onUpdateCard} />;
		};
	};
}
