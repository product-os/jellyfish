/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import update from 'immutability-helper'

export const generateActorFromUserCard = (card) => {
	let name = 'unknown user'

	// IF proxy is true, it indicates that the actor has been created as a proxy
	// for a real user in JF, usually as a result of syncing from an external
	// service
	let proxy = false
	const email = _.get(card, [ 'data', 'email' ], '')

	const isBalenaTeam = _.find(
		_.get(card, [ 'links', 'is member of' ], []),
		{
			slug: 'org-balena'
		}
	)

	// Check if the user is part of the balena org
	if (isBalenaTeam) {
		name = card.name || card.slug.replace('user-', '')
	} else {
		proxy = true
		let handle = card.name || _.get(card, [ 'data', 'handle' ])
		if (!handle) {
			handle = email || card.slug.replace(/^(account|user)-/, '')
		}
		name = `[${handle}]`
	}

	return {
		name,
		email,
		avatarUrl: _.get(card, [ 'data', 'avatar' ]),
		proxy,
		card
	}
}

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
