import { analytics, sdk, store } from '../core';
import { actionCreators } from '../core/store';
import { Card } from '../types';

interface CreateLinkOptions {
	skipSuccessMessage?: boolean;
}

export const createLink = (
	fromCard: Partial<Card> & { type: string, id: string },
	toCard: Partial<Card> & { type: string, id: string },
	verb: string,
	options: CreateLinkOptions = {},
) => {
	return sdk.card.link(fromCard, toCard, verb as any)
		.tap(() => {
			analytics.track('element.create', {
				element: {
					type: 'link',
				},
			});
		})
		.tap(() => {
			if (!options.skipSuccessMessage) {
				store.dispatch(actionCreators.addNotification('success', 'Created new link'));
			}
		})
		.catch((error) => {
			store.dispatch(actionCreators.addNotification('danger', error.message));
		});
};
