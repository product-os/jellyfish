import * as _ from 'lodash';
import actions from '../../actions';
import { updateThreadChannels } from '../../helpers';
import { selectors } from '../';
import { triggerNotification } from './helpers';

export const streamUpdate = async (
	payload,
	getState,
	dispatch,
	user,
	types,
) => {
	const update = payload.data;
	if (update.after) {
		const card = update.after;
		const allChannels = selectors.getChannels(getState());

		// Create a desktop notification if an unread message ping appears
		// BUG: we don't get notified on message updates
		// Notify of any of these card types:
		triggerNotification(update, getState, dispatch, user, types);

		// If we receive a card that targets another card...
		const targetId = _.get(card, ['data', 'target']);
		if (targetId) {
			// ...update all channels that have this card in their links
			const channelsToUpdate = updateThreadChannels(
				targetId,
				card,
				allChannels,
			);
			for (const updatedChannel of channelsToUpdate) {
				dispatch({
					type: actions.UPDATE_CHANNEL,
					value: updatedChannel,
				});
			}

			// TODO (FUTURE): Also update view channels that have a list of threads in them
		}

		// If we receive a user card...
		if (card.type.split('@')[0] === 'user') {
			// ...and we have a corresponding card already cached in our Redux store
			if (selectors.getCard(card.id, card.type)(getState())) {
				// ...then update the card
				dispatch({
					type: actions.SET_CARD,
					value: card,
				});
			}
		}
	}
};
