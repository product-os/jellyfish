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
import CardFields from '../../../../../lib/ui-components/CardFields'
import CardLayout from '../../../layouts/CardLayout'
import Timeline from '../../list/Timeline'
import {
	colorHash
} from '../../../../../lib/ui-components/services/helpers'

const SingleCardTabs = styled(Tabs) `
	flex: 1

	> [role="tabpanel"] {
		flex: 1
	}
`

export default class SingleCardFull extends React.Component {
	constructor (props) {
		super(props)

		const tail = _.get(this.props.card.links, [ 'has attached element' ], [])

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0]
			return typeBase === 'message' || typeBase === 'whisper'
		})

		this.state = {
			activeIndex: comms.length ? 1 : 0
		}

		this.setActiveIndex = this.setActiveIndex.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return	!circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	setActiveIndex (activeIndex) {
		this.setState({
			activeIndex
		})
	}

	render () {
		const {
			actions,
			card,
			channel,
			fieldOrder,
			types,
			actionItems
		} = this.props
		const type = _.find(types, {
			slug: card.type.split('@')[0]
		})

		const relationships = _.get(type, [ 'data', 'meta', 'relationships' ])
		const tail = _.get(card.links, [ 'has attached element' ], [])

		// Never display a timeline segment for a user card. The `contact` card type
		// is meant for discussing a user and exposing the timeline on the user card
		// is more than likely going to cause people to accidentally expose internal
		// comments about a user to the user themselves. Disaster!
		const displayTimeline = card.type !== 'user'

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
				actionItems={actionItems}
			>
				<Divider width="100%" color={colorHash(card.type)} />

				<SingleCardTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title="Info">
						<Box p={3}>
							<CardFields
								card={card}
								fieldOrder={fieldOrder}
								type={type}
							/>
						</Box>
					</Tab>

					{displayTimeline && (
						<Tab title="Timeline">
							<Timeline.data.renderer
								card={card}
								allowWhispers
								tail={tail}
							/>
						</Tab>
					)}

					{_.map(relationships, (segment, index) => {
						return (
							<Tab title={segment.title} key={segment.title}>
								<Segment
									card={card}
									segment={segment}
									types={types}
									actions={actions}
								/>
							</Tab>
						)
					})}
				</SingleCardTabs>
			</CardLayout>
		)
	}
}
