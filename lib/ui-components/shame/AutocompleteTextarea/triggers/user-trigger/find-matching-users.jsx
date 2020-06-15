/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import getUsers from './get-users'

const getFullName = (data) => {
	const firstName = _.get(data, [ 'profile', 'name', 'first' ])
	const lastName = _.get(data, [ 'profile', 'name', 'last' ])
	const fullName = _.join([ firstName, lastName ], ' ').trim()
	return _.isEmpty(fullName) ? '' : `(${fullName})`
}

const findMatchingUsers = async (user, sdk, token, tag) => {
	if (!token) {
		return []
	}
	const users = await getUsers(user, sdk, token)
	const usernames = users.map(({
		slug,
		data
	}) => {
		return {
			slug: `${slug.replace(/^user-/, '')}`,
			name: getFullName(data)
		}
	})

	return usernames
}

export default findMatchingUsers
