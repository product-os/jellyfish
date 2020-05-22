/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import uuid from 'uuid/v4'

export const generateTeardownWhisper = (card, cardTypeName, problem, solution) => {
	const message = `${cardTypeName} closed.\n\n**User's problem**\n>${problem}\n\n**Solution**\n>${solution}`
	return {
		target: card,
		type: 'whisper',
		slug: `whisper-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message
		}
	}
}
