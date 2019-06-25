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
	Txt
} from 'rendition'
import CardFields from '../../components/CardFields'
import {
	Tag
} from '../../components/Tag'
import {
	selectors
} from '../../core'
import * as helpers from '../../services/helpers'
import Timeline from '../list/Timeline'
import CardLayout from '../../layouts/CardLayout'

class Thread extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card,
			channel,
			fieldOrder,
			types
		} = this.props

		const typeCard = _.find(types, {
			slug: card.type
		})

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={(
					<Txt mb={3}>
						<strong>
							Thread created at {helpers.formatTimestamp(card.created_at)}
						</strong>
					</Txt>
				)}
			>
				<Box px={3} pb={0}>
					{Boolean(card.tags) && card.tags.length > 0 && (
						<Box mb={1}>
							{_.map(card.tags, (tag) => {
								return <Tag mr={1}>#{tag}</Tag>
							})}
						</Box>
					)}

					<CardFields
						card={card}
						fieldOrder={fieldOrder}
						type={typeCard}
					/>
				</Box>

				<Box flex="1" style={{
					minHeight: 0
				}}>
					<Timeline.data.renderer
						card={this.props.card}
						tail={_.get(this.props.card, [ 'links', 'has attached element' ], [])}
					/>
				</Box>
			</CardLayout>
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
		format: 'full',
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
