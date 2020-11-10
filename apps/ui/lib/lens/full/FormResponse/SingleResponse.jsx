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
	Heading,
	Tab,
	Tabs,
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import Segment from '../../common/Segment'
import CardLayout from '../../../layouts/CardLayout'
import Timeline from '../../list/Timeline'
import {
	helpers
} from '@balena/jellyfish-ui-components'

const SingleCardTabs = styled(Tabs) `
	flex: 1

	> [role="tabpanel"] {
		flex: 1
	}
`

export default class SingleResponseFull extends React.Component {
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
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
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
				title={`${card.data.user}'s feedback`}
				card={card}
				channel={channel}
				actionItems={actionItems}
			>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<SingleCardTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title="Info">
						<Box p={3} style={{
							maxWidth: Theme.breakpoints[2]
						}}>
							<Heading.h5>Username</Heading.h5>
							<Txt>{card.data.user}</Txt>
							<br/>
							{
								_.map(card.data.responses, (response, index) => {
									return (
										<Box key={index}>
											<Heading.h5>{response.question}</Heading.h5>
											<Txt>{response.answer.value}</Txt>
											<br />
										</Box>
									)
								})
							}
						</Box>
					</Tab>

					{displayTimeline && (
						<Tab title="Internal Discussion">
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
									showLinkToExistingElementButton={false}
								/>
							</Tab>
						)
					})}
				</SingleCardTabs>
			</CardLayout>
		)
	}
}
