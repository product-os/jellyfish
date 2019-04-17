/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const storeHelpers = require('../../services/store-helpers')
const _ = require('lodash')

export const getCreator = (card) => {
	const createCard = _.find(_.get(card.links, [ 'has attached element' ], []), {
		type: 'create'
	})
	const actor = storeHelpers.getActor(_.get(createCard, [ 'data', 'actor' ]))
	return actor
}

export const getLastUpdate = (card) => {
	const sorted = _.sortBy(
		_.get(card.links['has attached element'], []),
		'data.timestamp'
	)
	return _.last(sorted)
}
