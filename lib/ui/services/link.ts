import { analytics, sdk, store } from '../core';
import { actionCreators } from '../core/store';

interface CreateLinkOptions {
	skipSuccessMessage?: boolean;
}

export const createLink = (
	fromId: string,
	toId: string,
	verb: string,
	options: CreateLinkOptions = {},
) => {
	sdk.card.link(fromId, toId, verb as any)
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
