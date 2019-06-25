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
import CardField from '../../../components/CardField'
import {
	Tag
} from '../../../components/Tag'
import CardLayout from '../../../layouts/CardLayout'
import * as helpers from '../../../services/helpers'
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
		const payload = card.data
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})
		const typeSchema = _.get(typeCard, [ 'data', 'schema' ])
		const localSchema = helpers.getLocalSchema(card)

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({}, {
			type: 'object',
			properties: {
				data: localSchema
			}
		}, typeSchema)
		const unorderedKeys = _.filter(_.keys(payload), (key) => {
			return !_.includes(fieldOrder, key)
		})
		const keys = (fieldOrder || []).concat(unorderedKeys)

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

					{_.map(keys, (key) => {
						return payload[key]
							? <CardField
								key={key}
								field={key}
								payload={payload}
								schema={_.get(schema, [ 'properties', 'data', 'properties', key ])}
							/>
							: null
					})}
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
