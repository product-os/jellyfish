/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import uuid from 'uuid/v4'
import {
	getMessageMetaData
} from '../../../../../lib/ui-components/services/helpers'

/**
 * Checks if the given card's type defines the statusDescription field
 *
 * @param {Array} types - list of all known card types
 * @param {Object} card - the card to check
 *
 * @returns {Boolean} True if the given card's type schema supports the statusDescription field
 */
export const schemaSupportsStatusText = (types, card) => {
	const typeCard = _.find(types, {
		slug: card.type.split('@')[0]
	})
	return _.has(typeCard, [ 'data', 'schema', 'properties', 'data', 'properties', 'statusDescription' ])
}

/**
 * Generates a whisper message for the given reassignment parameters
 *
 * @param {Object} currentOwner - the user currently assigned to the card (null if not currently assigned)
 * @param {Object} newOwner - the user about to be assigned to the card (null if unassigning)
 * @param {String} reason - the reason for the reassignment
 *
 * @returns {String} The whisper message
 */
export const generateWhisperMessage = (currentOwner, newOwner, reason) => {
	const reasonSuffix = reason ? `\n\n>${reason}` : ''
	const currentOwnerSlug = currentOwner ? currentOwner.slug.replace('user-', '') : null
	const newOwnerSlug = newOwner ? newOwner.slug.replace('user-', '') : null
	if (currentOwner) {
		if (newOwner) {
			return `Reassigned from @${currentOwnerSlug} to @${newOwnerSlug}${reasonSuffix}`
		}
		return `Unassigned from @${currentOwnerSlug}${reasonSuffix}`
	}
	if (newOwner) {
		return `Assigned to @${newOwnerSlug}${reasonSuffix}`
	}

	// Note: we should never get here as it indicates we're trying to unassign
	// a card but the card has no current owner. But to cope with race conditions
	// we just return null which can be interpreted as 'don't send a whisper'
	return null
}

/**
 * Generates a whisper card that represents the ownership handover
 *
 * @param {Object} card - the card being handed over
 * @param {Object} currentOwner - the user currently assigned to the card (null if not currently assigned)
 * @param {Object} newOwner - the user about to be assigned to the card (null if unassigning)
 * @param {String} reason - the reason for the reassignment
 *
 * @returns {Object} - the whisper card
 */
export const getHandoverWhisperEventCard = (card, currentOwner, newOwner, reason) => {
	let whisper = null
	const message = generateWhisperMessage(currentOwner, newOwner, reason)
	if (message) {
		const {
			mentionsUser,
			alertsUser,
			mentionsGroup,
			alertsGroup,
			tags
		} = getMessageMetaData(message)

		whisper = {
			target: card,
			type: 'whisper',
			slug: `whisper-${uuid()}`,
			tags,
			payload: {
				mentionsUser,
				alertsUser,
				mentionsGroup,
				alertsGroup,
				message
			}
		}
	}
	return whisper
}
