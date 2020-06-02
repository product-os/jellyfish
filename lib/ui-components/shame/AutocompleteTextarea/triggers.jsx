/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import emoji from 'node-emoji'
import React from 'react'
import {
	Flex,
	Txt
} from 'rendition'
import debounce from 'debounce-promise'

const AUTOCOMPLETE_DEBOUNCE = 250

const getUsers = async (user, sdk, value) => {
	// Get the current user's organisations
	const orgs = _.map(user.links['is member of'], 'slug')

	// Return all matching users in the same organisation(s)
	const results = await sdk.query({
		$$links: {
			'is member of': {
				type: 'object',
				properties: {
					slug: {
						enum: orgs
					}
				}
			}
		},
		type: 'object',
		properties: {
			type: {
				const: 'user@1.0.0'
			},
			slug: {
				regexp: {
					pattern: `^user-${value}`,
					flags: 'i'
				}
			}
		},
		required: [ 'type', 'slug' ],
		additionalProperties: true
	}, {
		limit: 10,
		sortBy: 'slug'
	})

	return results
}

const getGroups = async (sdk, value) => {
	// Return all matching user groups
	// TODO: limit this by organisation
	const results = await sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'group@1.0.0'
			},
			name: {
				pattern: `^${value}`
			}
		},
		required: [ 'type', 'name' ],
		additionalProperties: true
	}, {
		limit: 10,
		sortBy: 'slug'
	})

	return results
}

const EmojiItem = ({
	entity
}) => {
	return (
		<Flex
			style={{
				minWidth: 160
			}}
		>
			<Txt mr={3}>{entity.emoji}</Txt>
			<Txt>:{entity.key}:</Txt>
		</Flex>
	)
}

export const getTrigger = _.memoize((allTypes, sdk, user) => {
	return {
		':': {
			dataProvider: (token) => {
				if (!token) {
					return []
				}
				return emoji.search(token).slice(0, 10)
			},
			component: EmojiItem,
			output: (item) => { return item.emoji }
		},
		'@': {
			dataProvider: debounce(async (token) => {
				if (!token) {
					return []
				}
				const users = await getUsers(user, sdk, token)
				const usernames = users.map(({
					slug
				}) => {
					return `@${slug.replace(/^user-/, '')}`
				})

				return usernames
			}, AUTOCOMPLETE_DEBOUNCE),
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'!': {
			dataProvider: debounce(async (token) => {
				if (!token) {
					return []
				}
				const users = await getUsers(user, sdk, token)
				const usernames = users.map(({
					slug
				}) => {
					return `!${slug.replace(/^user-/, '')}`
				})

				return usernames
			}, AUTOCOMPLETE_DEBOUNCE),
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'@@': {
			dataProvider: debounce(async (token) => {
				if (!token) {
					return []
				}
				const groups = await getGroups(sdk, token.replace(/^@+/, ''))
				return groups.map((group) => {
					return `@@${group.name}`
				})
			}, AUTOCOMPLETE_DEBOUNCE),
			component: ({
				entity
			}) => {
				return <div>{entity}</div>
			},
			output: (item) => {
				return item
			}
		},
		'!!': {
			dataProvider: debounce(async (token) => {
				if (!token) {
					return []
				}
				const groups = await getGroups(sdk, token.replace(/^!+/, ''))
				return groups.map((group) => {
					return `!!${group.name}`
				})
			}, AUTOCOMPLETE_DEBOUNCE),
			component: ({
				entity
			}) => {
				return <div>{entity}</div>
			},
			output: (item) => {
				return item
			}
		},
		'?': {
			dataProvider: (token) => {
				const types = allTypes
					.map(({
						slug
					}) => { return `?${slug}` })
				if (!token) {
					return types
				}
				const matcher = `?${token.toLowerCase()}`
				return types.filter((slug) => {
					return _.startsWith(slug, matcher)
				})
			},
			component: ({
				entity
			}) => {
				return <div>{entity}</div>
			},
			output: (item) => {
				return item
			}
		},
		'#': {
			dataProvider: debounce(async (token) => {
				if (!token) {
					return []
				}

				const matcher = token.toLowerCase()

				const cards = await sdk.query({
					type: 'object',
					description: `Tag that matches ${matcher}`,
					properties: {
						type: {
							const: 'tag@1.0.0'
						},
						name: {
							pattern: `^${matcher}`
						},
						data: {
							type: 'object'
						}
					}
				}, {
					limit: 10
				})

				return _.reverse(
					_.sortBy(cards, 'data.count')
				)
			}, AUTOCOMPLETE_DEBOUNCE),
			component: ({
				entity
			}) => {
				return (
					<Flex
						style={{
							minWidth: 160
						}}
						justifyContent="space-between"
					>
						<Txt mr={3}>#{entity.name}</Txt>
						<Txt>x {entity.data.count}</Txt>
					</Flex>
				)
			},
			output: (item) => {
				return `#${item.name}`
			}
		}
	}
})
