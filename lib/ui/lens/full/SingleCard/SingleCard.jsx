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
	Box
} from 'rendition'
import CardFields from '../../../components/CardFields'
import {
	Tag
} from '../../../components/Tag'
import CardLayout from '../../../layouts/CardLayout'
import Timeline from '../../list/Timeline'

export default class SingleCardFull extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card,
			channel,
			fieldOrder
		} = this.props
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
			>
				<Box p={3} flex="1" style={{
					overflowY: 'auto'
				}}>
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

				<Box
					style={{
						maxHeight: '50%'
					}}
					flex="0"
				>
					<Timeline.data.renderer
						card={this.props.card}
						tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
					/>
				</Box>
			</CardLayout>
		)
	}
}
