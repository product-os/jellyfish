/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import findMatchingUsers from './find-matching-users'

const userTrigger = (user, sdk, tag) => {
	return {
		dataProvider: async (token) => {
			return findMatchingUsers(user, sdk, token, tag)
		},
		component: ({
			entity: {
				slug,
				name
			}
		}) => {
			return <div>{`${tag}${slug} ${name}`.trim()}</div>
		},
		output: (item) => {
			return `${tag}${item.slug}`
		}
	}
}

export default userTrigger
