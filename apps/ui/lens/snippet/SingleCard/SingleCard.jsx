/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Flex,
	Txt
} from 'rendition'
import CardFields from '../../../../../lib/ui-components/CardFields'
import Link from '../../../../../lib/ui-components/Link'
import {
	Tag
} from '../../../../../lib/ui-components/Tag'
import Icon from '../../../../../lib/ui-components/shame/Icon'

export default class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card,
			fieldOrder
		} = this.props
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0]
		})

		// Count the number of non-event links the card has
		const numLinks = _.reduce(card.links, (carry, value, key) => {
			return key === 'has attached element' ? carry : carry + value.length
		}, 0)

		return (
			<Box pb={3}>
				<Flex justifyContent="space-between">
					<Txt>
						<Link append={card.slug || card.id}>
							<strong>{card.name || card.slug}</strong>
						</Link>
					</Txt>

					{numLinks > 0 && (
						<Box>
							{numLinks}
							{' '}
							<Icon name="bezier-curve" />
						</Box>
					)}
				</Flex>

				{Boolean(card.tags) && card.tags.length > 0 && (
					<Box mb={1}>
						{_.map(card.tags, (tag) => {
							return <Tag key={tag} mr={1}>#{tag}</Tag>
						})}
					</Box>
				)}

				<CardFields
					card={card}
					fieldOrder={fieldOrder}
					type={typeCard}
				/>
			</Box>
		)
	}
}
