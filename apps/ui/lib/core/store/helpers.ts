import _ from 'lodash';
import update from 'immutability-helper';

/**
 * Given a target card id and a card that's been updated, finds all channels
 * representing the target card. For each matching channel, the
 * linked card is updated with the new card.
 *
 * Note: allChannels is not mutated.
 *
 * @param {String} targetId - the ID of the card's target
 * @param {Object} card - the card to update
 * @param {Array} allChannels - an array of all channels
 *
 * @returns {Array} - an array of updated channels
 */
export const updateThreadChannels = (targetId, card, allChannels) => {
	const updatedChannels: any[] = [];
	const matchingChannels = _.filter(allChannels, (item) => {
		const headId = _.get(item, ['data', 'head', 'id']);
		return headId === targetId;
	});
	_.forEach(matchingChannels, (channel) => {
		const links = _.get(channel, ['data', 'head', 'links']);
		_.forEach(links, (linkedCards, linkName) => {
			const cardIndex = _.findIndex(linkedCards, {
				id: card.id,
			});
			if (cardIndex !== -1) {
				const updatedChannel = update(channel, {
					data: {
						head: {
							links: {
								[linkName]: {
									[cardIndex]: {
										$set: card,
									},
								},
							},
						},
					},
				});
				updatedChannels.push(updatedChannel);

				// Assume a card will only be found once in a channel
				// i.e. a card won't appear under multiple link names (when this is supported)
				return false;
			}
			return true;
		});
	});
	return updatedChannels;
};

// Note: once we switch to sending notifications using Web Push, this
// function should be removed as it is a temporary and sub-optimal approach
// to determining if a user should be notified about a card.
export const mentionsUser = (card, user, groups) => {
	if (
		_.includes(
			_.concat(
				_.get(card, ['data', 'payload', 'mentionsUser'], []),
				_.get(card, ['data', 'payload', 'alertsUser'], []),
			),
			user.slug,
		)
	) {
		return true;
	}

	if (
		card.type.split('@')[0] === 'message' &&
		_.some(_.invokeMap(_.get(card, ['markers'], []), 'includes', user.slug))
	) {
		return true;
	}

	const groupMentions = _.union<string>(
		_.get(card, ['data', 'payload', 'mentionsGroup'], []),
		_.get(card, ['data', 'payload', 'alertsGroup'], []),
	);

	return _.some(groupMentions, (groupName) => {
		return _.get(groups, [groupName, 'isMine']);
	});
};
