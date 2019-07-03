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
	Divider,
	Tabs
} from 'rendition'
import Segment from './Segment'
import CardFields from '../../../components/CardFields'
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
		const type = _.find(this.props.types, {
			slug: card.type
		})

		const tabs = [ 'Info', 'Timeline' ]

		const relationships = _.get(type, [ 'data', 'meta', 'relationships' ])

		if (relationships) {
			for (const segment of relationships) {
				tabs.push(segment.title)
			}
		}

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
			>
				<Divider width="100%" color="#eee" />

				<Tabs
					tabs={tabs}
					style={{
						flex: 1
					}}
				>
					<Box p={3}>
						<CardFields
							card={card}
							fieldOrder={fieldOrder}
							type={type}
						/>
					</Box>

					<Timeline.data.renderer
						card={this.props.card}
						tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
					/>

					{relationships && _.map(relationships, (segment) => {
						return (
							<Segment
								card={card}
								segment={segment}
								addChannel={this.props.actions.addChannel}
								getLinks={this.props.actions.getLinks}
								queryAPI={this.props.actions.queryAPI}
							/>
						)
					})}
				</Tabs>
			</CardLayout>
		)
	}
}
