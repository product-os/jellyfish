/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import * as React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Tabs
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../core'
import * as storeHelpers from '../../services/store-helpers'
import Column from '../../shame/Column'
import Icon from '../../shame/Icon'
import SupportThreadSummary from './SupportThreadSummary'

const SLUG = 'lens-support-threads'

export class SupportThreads extends React.Component {
	constructor (props) {
		super(props)
		this.openChannel = (target, obj) => {
			// If a card is not provided, see if a matching card can be found from this
			// component's state/props
			const card = obj || _.find(this.props.tail || [], {
				id: target
			})
			this.props.actions.addChannel({
				cardType: card.type,
				target,
				parentChannel: this.props.channel.id
			})
		}
		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false
		}

		this.handleScroll = async () => {
			const {
				scrollArea, loadingPage
			} = this
			if (!scrollArea) {
				return
			}
			this.scrollBottomOffset = scrollArea.scrollHeight - (scrollArea.scrollTop + scrollArea.offsetHeight)
			if (loadingPage) {
				return
			}
			if (this.scrollBottomOffset > 200) {
				return
			}
			this.loadingPage = true
			await this.props.setPage(this.props.page + 1)
			this.loadingPage = false
		}
	}

	render () {
		const tail = _.sortBy(this.props.tail, (element) => {
			const timestamps = _.map(
				_.get(element.links, [ 'has attached element' ], []),
				'data.timestamp'
			)
			timestamps.sort()
			return _.last(timestamps)
		}).reverse()

		const pendingAgentResponse = []
		const pendingUserResponse = []

		for (const card of tail) {
			/**
			 * Check if the thread is pending user response:
			 *
			 * 1. Work through the timeline in reverse, so that we evaluate the most
			 *    recent events first
			 * 2. If there is a message or whisper that has the 'pendinguserresponse' tag,
			 *    then we are waiting for a response
			 * 3. If a proxy response is found before the tag, then we are not waiting
			 *    for a response
			 */

			// Sort the timeline by timestamp rathern than created_at as they might
			// not be the same value if the card was backsynced
			const timeline = _.sortBy(
				_.get(card.links, [ 'has attached element' ], []),
				'data.timestamp'
			)

			// Reverse the timeline, so the newest messages appear first
			timeline.reverse()

			let isPendingUserResponse = false

			// Iterate over the timeline
			for (const event of timeline) {
				if (event.type === 'message' || event.type === 'whisper') {
					// If the message contains the 'pendinguserresponse' tag, then we are
					// waiting on a response and can break out of the loop
					if (event.data.payload.message && event.data.payload.message.match(/#pendinguserresponse/gi)) {
						isPendingUserResponse = true
						break
					}

					// If we are still looping and the message came from a user/proxy then
					// we can simply break out of the loop
					const actor = storeHelpers.getActor(event.data.actor)
					if (actor.proxy) {
						break
					}
				}
			}

			if (isPendingUserResponse) {
				pendingUserResponse.push(card)
			} else {
				pendingAgentResponse.push(card)
			}
		}

		const activeThread = _.get(
			_.find(this.props.channels, [ 'data.cardType', 'support-thread' ]),
			[ 'data', 'head', 'id' ]
		)

		const segments = [
			{
				name: 'All',
				cards: tail
			},
			{
				name: 'pending agent response',
				cards: pendingAgentResponse
			},
			{
				name: 'pending user response',
				cards: pendingUserResponse
			}
		]

		return (
			<Column data-test={`lens--${SLUG}`}>
				{tail.length > 0 && (
					<Tabs
						style={{
							height: '100%',
							display: 'flex',
							flexDirection: 'column'
						}}
						tabs={_.map(segments, 'name')}
					>
						{segments.map((segment) => {
							return (
								<div
									ref={(ref) => {
										this.scrollArea = ref
									}}
									key={segment.name}
									onScroll={this.handleScroll}
									style={{
										height: '100%',
										paddingBottom: 16,
										overflowY: 'auto'
									}}
								>
									{_.map(segment.cards, (card) => {
										return (
											<SupportThreadSummary
												key={card.id}
												active={activeThread === card.id}
												card={card}
												openChannel={this.openChannel}
											/>
										)
									})}

									{this.props.totalPages > this.props.page + 1 && (
										<Box p={3}>
											<Icon spin name="cog"/>
										</Box>
									)}
								</div>
							)
						})}
					</Tabs>
				)}

			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		allUsers: selectors.getAllUsers(state),
		channels: selectors.getChannels(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'SupportThreads lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThreads),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					}
				}
			}
		},
		queryOptions: {
			limit: 30,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}
export default lens
