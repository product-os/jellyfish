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
import CardFields from '../../../components/CardFields'
import Link from '@balena/jellyfish-ui-components/lib/Link'
import {
	TagList
} from '@balena/jellyfish-ui-components/lib/Tag'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'

export default class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card
		} = this.props
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0]
		})

		// Count the number of non-event links the card has
		const numLinks = _.reduce(card.links, (carry, value, key) => {
			return key === 'has attached element' ? carry : carry + value.length
		}, 0)

		return (
			<Box pb={3} data-test="snippet--card" data-test-id={`snippet-card-${card.id}`}>
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

				<TagList
					tags={card.tags}
					mb={1}
				/>

				<CardFields
					card={card}
					type={typeCard}
				/>
			</Box>
		)
	}
}
