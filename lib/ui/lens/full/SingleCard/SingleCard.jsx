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
	Tab,
	Tabs
} from 'rendition'
import styled from 'styled-components'
import Segment from './Segment'
import CardFields from '../../../components/CardFields'
import CardLayout from '../../../layouts/CardLayout'
import Timeline from '../../list/Timeline'

const SingleCardTabs = styled(Tabs) `
	flex: 1

	> [role="tabpanel"] {
		flex: 1
	}
`

export default class SingleCardFull extends React.Component {
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
		const type = _.find(types, {
			slug: card.type
		})

		const relationships = _.get(type, [ 'data', 'meta', 'relationships' ])

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
			>
				<Divider width="100%" color="#eee" />

				<SingleCardTabs>
					<Tab title="Timeline">
						<Timeline.data.renderer
							card={this.props.card}
							allowWhispers
							tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
						/>
					</Tab>

					<Tab title="Info">
						<Box p={3}>
							<CardFields
								card={card}
								fieldOrder={fieldOrder}
								type={type}
							/>
						</Box>
					</Tab>

					{_.map(relationships, (segment, index) => {
						return (
							<Tab title={segment.title} key={segment.title}>
								<Segment
									card={card}
									segment={segment}
									types={types}
									addChannel={this.props.actions.addChannel}
									getLinks={this.props.actions.getLinks}
									queryAPI={this.props.actions.queryAPI}
								/>
							</Tab>
						)
					})}
				</SingleCardTabs>
			</CardLayout>
		)
	}
}
