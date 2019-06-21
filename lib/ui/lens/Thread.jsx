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
	connect
} from 'react-redux'
import {
	Box,
	Flex,
	Txt
} from 'rendition'
import CardActions from '../components/CardActions'
import CardField from '../components/CardField'
import {
	Tag
} from '../components/Tag'
import {
	selectors
} from '../core'
import helpers from '../services/helpers'
import Timeline from './Timeline'
import {
	CloseButton
} from '../shame/CloseButton'
import Column from '../shame/Column'

class Thread extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card, 
			fieldOrder, 
			level,
			types
		} = this.props

		const payload = card.data

		const typeCard = _.find(types, {
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
		const cardSlug = _.get(card, [ 'slug' ])
		const cardType = _.get(card, [ 'type' ])

		return (
			<Column
				className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
				flex={this.props.flex}
			>
				<Box p={3} pb={0}>
					<Flex justifyContent="space-between">
						{card.created_at && (
							<Txt mb={3}>
								<strong>
									Thread created at {helpers.formatTimestamp(card.created_at)}
								</strong>
							</Txt>
						)}

						{!level && (
							<Flex align="baseline">
								<CardActions card={card}/>

								<CloseButton
									ml={3}
									channel={this.props.channel}
								/>
							</Flex>
						)}
					</Flex>

					{Boolean(card.tags) && card.tags.length > 0 && (
						<Box mb={1}>
							{_.map(card.tags, (tag) => {
								return <Tag mr={1}>#{tag}</Tag>
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

				<Box flex="1" style={{
					minHeight: 0
				}}>
					<Timeline.data.renderer
						card={this.props.card}
						tail={_.get(this.props.card, [ 'links', 'has attached element' ], [])}
					/>
				</Box>
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const lens = {
	slug: 'lens-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps)(Thread),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'thread'
				}
			}
		}
	}
}

export default lens
