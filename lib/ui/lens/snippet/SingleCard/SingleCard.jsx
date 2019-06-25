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
import CardField from '../../../components/CardField'
import Link from '../../../components/Link'
import {
	Tag
} from '../../../components/Tag'
import * as helpers from '../../../services/helpers'

export default class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card,
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
		)
	}
}
