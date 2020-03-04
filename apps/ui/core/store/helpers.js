/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

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
