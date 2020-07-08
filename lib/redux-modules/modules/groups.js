/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

export const id = 'groups'

export const factory = (modules, selector) => {
	const actionTypes = {
		SET_GROUPS: 'SET_GROUPS'
	}

	const defaultState = {}

	const reducer = (state = defaultState, action) => {
		switch (action.type) {
			case actionTypes.SET_GROUPS: {
				const {
					groups,
					userSlug
				} = action.value

				const newGroups = _.reduce(groups, (acc, group) => {
					const groupUsers = _.map(group.links['has group member'], 'slug')
					const groupSummary = {
						name: group.name,
						users: groupUsers,
						isMine: groupUsers.includes(userSlug)
					}
					acc[group.name] = groupSummary
					return acc
				}, {})

				return newGroups
			}
			default:
				return state
		}
	}

	const actionCreators = {
		setGroups: (groups, user) => {
			return {
				type: actionTypes.SET_GROUPS,
				value: {
					groups,
					userSlug: user.slug
				}
			}
		}
	}

	const selectors = {
		getGroups: () => {
			return (state) => {
				return selector(state)
			}
		}
	}

	return {
		defaultState,
		actionTypes,
		reducer,
		actionCreators,
		selectors
	}
}
