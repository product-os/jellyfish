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
import {
	Collapsible,
	helpers,
	TagList
} from '@balena/jellyfish-ui-components'
import CardFields from '../../components/CardFields'
import {
	selectors
} from '../../core'
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
			types
		} = this.props

		const typeCard = _.find(types, {
			slug: card.type.split('@')[0]
		})

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={(
					<Txt mb={[ 0, 0, 3 ]}>
						<strong>
							Thread created at {helpers.formatTimestamp(card.created_at)}
						</strong>
					</Txt>
				)}
			>
				<Collapsible
					title="Details"
					px={3}
					maxContentHeight='50vh'
					lazyLoadContent
					data-test="thread-details"
				>
					<TagList
						tags={card.tags}
						my={1}
					/>

					<CardFields
						card={card}
						type={typeCard}
					/>
				</Collapsible>

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
					const: 'thread@1.0.0'
				}
			}
		}
	}
}

export default lens
