/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex,
	Txt
} from 'rendition'

const tagTrigger = (sdk) => {
	return {
		dataProvider: async (token) => {
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
		},
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

export default tagTrigger
