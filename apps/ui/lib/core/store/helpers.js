/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import update from 'immutability-helper'
import {
	constraints
} from '@balena/jellyfish-client-sdk/lib/link-constraints'
import memoize from 'memoize-one'

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
	const updatedChannels = []
	const matchingChannels = _.filter(allChannels, (item) => {
		const headId = _.get(item, [ 'data', 'head', 'id' ])
		return headId === targetId
	})
	_.forEach(matchingChannels, (channel) => {
		const links = _.get(channel, [ 'data', 'head', 'links' ])
		_.forEach(links, (linkedCards, linkName) => {
			const cardIndex = _.findIndex(linkedCards, {
				id: card.id
			})
			if (cardIndex !== -1) {
				const updatedChannel = update(channel, {
					data: {
						head: {
							links: {
								[linkName]: {
									[cardIndex]: {
										$set: card
									}
								}
							}
						}
					}
				})
				updatedChannels.push(updatedChannel)

				// Assume a card will only be found once in a channel
				// i.e. a card won't appear under multiple link names (when this is supported)
				return false
			}
			return true
		})
	})
	return updatedChannels
}

// Note: once we switch to sending notifications using Web Push, this
// function should be removed as it is a temporary and sub-optimal approach
// to determining if a user should be notified about a card.
export const mentionsUser = (card, user, groups) => {
	if (_.includes(_.get(card, [ 'data', 'payload', 'mentionsUser' ]), user.slug)) {
		return true
	}

	if (card.type.split('@')[0] === 'message' &&
	_.some(_.invokeMap(_.get(card, [ 'markers' ], []), 'includes', user.slug))) {
		return true
	}

	const groupMentions = _.get(card, [ 'data', 'payload', 'mentionsGroup' ], [])
	return _.some(groupMentions, (groupName) => {
		return _.get(groups, [ groupName, 'isMine' ])
	})
}

export const getAllLinkQueries = memoize(() => {
	let links = {}
	constraints.forEach((constraint) => {
		links = {
			...links,
			[constraint.name]: {
				type: 'object',
				additionalProperties: true
			}
		}
	})
	return links
})
