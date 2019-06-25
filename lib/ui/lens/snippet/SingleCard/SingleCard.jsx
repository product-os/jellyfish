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
	Txt
} from 'rendition'
import CardFields from '../../../components/CardFields'
import Link from '../../../components/Link'
import {
	Tag
} from '../../../components/Tag'

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
			slug: card.type
		})

		return (
			<Box pb={3}>
				<Txt>
					<Link append={card.slug || card.id}>
						<strong>{card.name || card.slug}</strong>
					</Link>
				</Txt>

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
