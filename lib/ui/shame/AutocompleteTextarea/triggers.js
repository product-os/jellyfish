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
import {
	selectors,
	sdk,
	store
} from '../../core'

const getUsers = async (value) => {
	const results = await sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'user'
			},
			slug: {
				pattern: value
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

export const getTrigger = _.memoize(() => {
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
			dataProvider: async (token) => {
				if (!token) {
					return []
				}
				const users = await getUsers(token)
				const usernames = users.map(({
					slug
				}) => {
					return `@${slug.replace(/^user-/, '')}`
				})

				return usernames
			},
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'!': {
			dataProvider: async (token) => {
				if (!token) {
					return []
				}
				const users = await getUsers(token)
				const usernames = users.map(({
					slug
				}) => {
					return `!${slug.replace(/^user-/, '')}`
				})

				return usernames
			},
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'?': {
			dataProvider: (token) => {
				const types = selectors.getTypes(store.getState())
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
			dataProvider: _.debounce(async (token) => {
				if (!token) {
					return []
				}

				const matcher = token.toLowerCase()

				const cards = await sdk.query({
					type: 'object',
					description: `Tag that matches ${matcher}`,
					properties: {
						type: {
							const: 'tag'
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
			}, 250, {
				leading: true
			}),
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
