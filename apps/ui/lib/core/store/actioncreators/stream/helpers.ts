import { helpers } from '@balena/jellyfish-ui-components';
import * as _ from 'lodash';
import { selectors } from '..';
import { mentionsUser } from '../../helpers';
import { createNotification } from '../../../../services/notifications';
import { push } from 'connected-react-router';

const notifySchema = [
	{
		type: 'message',
		update: ['insert'],
	},
	{
		type: 'whisper',
		update: ['insert'],
	},
	{
		type: 'summary',
		update: ['insert'],
	},
	{
		type: 'rating',
		update: ['insert'],
	},
];

/**
 * A method in the stream to trigger notifications. This handles the logic for which update events should trigger notifications.
 *
 * @param {Object} update - stream event update object
 * @param {Function} getState - store getState function
 * @param {Function} dispatch - store dispatch function
 * @param {Object} user - the current user card
 * @param {Array} types - list of all known card types
 */
export const triggerNotification = (
	update,
	getState,
	dispatch,
	user,
	types,
) => {
	const card = update.after;
	const groupsState = selectors.getGroups(getState());

	const event = {
		type: card.type.split('@')[0],
		update: [update.type],
	};

	const matchNotifySchema = _.some(notifySchema, event);
	const isOwnMessage = _.get(card, ['data', 'actor']) === user.id;
	const isMentioned = mentionsUser(card, user, groupsState);
	const isRead = _.includes(_.get(card, ['data', 'readBy']), user.slug);
	if (matchNotifySchema && !isOwnMessage && isMentioned && !isRead) {
		handleNotification({
			card,
			cardType: helpers.getType(card.type, types),
		})(dispatch, getState);
	}
};

/**
 * Create a notification by calling this function with a card and card type
 *
 * @param {Object} props - Function props object
 * @param {Object} props.card - Card type card that should be shown in the notification
 * @param {String} props.cardType - The Card type
 * @returns {null}
 */
export const handleNotification = ({ card, cardType }) => {
	return (dispatch, getState) => {
		const state = getState();

		// Skip notifications if the user's status is set to 'Do Not Disturb'
		const userStatus = selectors.getCurrentUserStatus(state);
		if (_.get(userStatus, ['value']) === 'DoNotDisturb') {
			return;
		}

		const user = selectors.getCurrentUser(state);
		const disableSound = _.get(
			user,
			['data', 'profile', 'disableNotificationSound'],
			false,
		);

		const baseType = card.type.split('@')[0];
		const title = `New ${_.get(cardType, ['name'], baseType)}`;
		const body = _.get(card, ['data', 'payload', 'message']);
		const target = _.get(card, ['data', 'target']);

		createNotification({
			title,
			body,
			target,
			disableSound,
			tag: card.id,
			historyPush: (path, pathState) => dispatch(push(path, pathState)),
		});
	};
};
