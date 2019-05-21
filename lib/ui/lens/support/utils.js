/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

export const getCreator = async (getActorFn, card) => {
	const createCard = _.find(_.get(card.links, [ 'has attached element' ], []), {
		type: 'create'
	})
	const actor = await getActorFn(_.get(createCard, [ 'data', 'actor' ]))
	return actor
}

export const getLastUpdate = (card) => {
	const sorted = _.sortBy(
		_.get(card.links, [ 'has attached element' ], []),
		'data.timestamp'
	)
	return _.last(sorted)
}
