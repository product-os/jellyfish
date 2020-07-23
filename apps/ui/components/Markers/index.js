/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	commaListsAnd
} from 'common-tags'
import * as _ from 'lodash'
import React from 'react'
import {
	Txt
} from 'rendition'

export default function CountFavicon ({
	card
}) {
	if (!card || !card.markers || !card.markers.length) {
		return null
	}

	const distinctMarkers = _.uniq(_.flatMap(card.markers, (marker) => marker.split('+')))

	const [ users, orgs ] = _.partition(distinctMarkers, _.partial(_.startsWith, _, 'user'))

	const cleanUsers = users.map((user) => user.replace(/^user-/, ''))
	const cleanOrgs = orgs.map((org) => org.replace(/^org-/, ''))

	let message = 'Only visible to '
	if (cleanUsers.length === 1) {
		message += `${cleanUsers[0]} `
	}
	if (cleanUsers.length > 1) {
		message += commaListsAnd `users ${cleanUsers} `
	}

	if (cleanUsers.length && cleanOrgs.length) {
		message += 'and '
	}

	if (cleanOrgs.length) {
		message += `members of ${commaListsAnd `${cleanOrgs}`}`
	}

	return (
		<Txt px={3} italic fontSize={0}>
			<em>
				{message}
			</em>
		</Txt>
	)
}
