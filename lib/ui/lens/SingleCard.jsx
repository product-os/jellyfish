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
import Link from '../components/Link'
import {
	Tag
} from '../components/Tag'
import {
	selectors
} from '../core'
import * as helpers from '../services/helpers'
import Timeline from './Timeline'
import {
	CloseButton
} from '../shame/CloseButton'
import Column from '../shame/Column'

class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card, fieldOrder, level
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
		const cardSlug = _.get(card, [ 'slug' ])
		const cardType = _.get(card, [ 'type' ])
		const content = (
			<React.Fragment>
				<Flex justifyContent="space-between">
					<Txt mb={3}>
						<strong>
							{level > 0 && (
								<Link
									append={card.slug || card.id}
									className={`header-link header-link--${card.slug || card.id}`}
								>
									{card.name || card.slug || card.type}
								</Link>
							)}
							{!level && (
								<div
									style={{
										fontSize: 14, display: 'block'
									}}
								>
									{card.name || card.slug || card.type}
								</div>
							)}
						</strong>
					</Txt>

					{!level && (<Flex align="baseline">
						<CardActions card={card}/>

						<CloseButton
							ml={3}
							channel={this.props.channel}
						/>
					</Flex>)}
				</Flex>

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
			</React.Fragment>
		)

		if (!level) {
			return (
				<Column
					className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
					flex={this.props.flex}
					overflowY
				>
					<Box p={3} flex="1" style={{
						overflowY: 'auto'
					}}>
						{content}
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
				</Column>
			)
		}

		return (
			<Box mb={3}>
				{content}
			</Box>
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
		renderer: connect(mapStateToProps)(SingleCard),
		filter: {
			type: 'object'
		}
	}
}

export default lens
