/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird'
import {
	circularDeepEqual,
	deepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import * as React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import styled from 'styled-components'
import {
	Box,
	Tab,
	Tabs
} from 'rendition'
import {
	CardChatSummary,
	Column,
	helpers,
	Icon,
	InfiniteList
} from '@balena/jellyfish-ui-components'
import {
	actionCreators,
	selectors
} from '../../core'

const StyledTabs = styled(Tabs) `
	flex: 1

	> [role="tabpanel"] {
		flex: 1
	}
`

const SLUG = 'lens-support-threads'

// This name is added to update events that reopen issues
const THREAD_REOPEN_NAME = 'Re-opened because linked issue was closed'

// One day in milliseconds
const ENGINEER_RESPONSE_TIMEOUT = 1000 * 60 * 60 * 24

const timestampSort = (cards) => {
	return _.sortBy(cards, (element) => {
		const timestamps = _.map(
			_.get(element.links, [ 'has attached element' ], []),
			'data.timestamp'
		)
		timestamps.sort()
		return _.last(timestamps)
	}).reverse()
}

export class SupportThreads extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			segments: []
		}

		this.handleScrollEnding = async () => {
			await this.props.setPage(this.props.page + 1)
		}

		this.setActiveIndex = this.setActiveIndex.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidMount () {
		this.generateSegments()
	}

	componentDidUpdate (prevProps) {
		if (!deepEqual(this.props.tail, prevProps.tail)) {
			this.generateSegments()
		}
	}

	async generateSegments () {
		const tail = timestampSort(this.props.tail)

		const pendingAgentResponse = []
		const pendingEngineerResponse = []
		const pendingUserResponse = []
		const discussions = []

		await Bluebird.map(tail, async (card) => {
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

			// Sort the timeline by timestamp rather than created_at as they might
			// not be the same value if the card was backsynced
			const timeline = _.sortBy(
				_.get(card.links, [ 'has attached element' ], []),
				'data.timestamp'
			)

			// If the card contains a message/whisper tagged as a discussion, move it to the discussion tab
			for (const event of timeline) {
				if (_.includes(event.tags, 'discussion')) {
					discussions.push(card)
					return
				}
			}

			// Reverse the timeline, so the newest messages appear first
			timeline.reverse()

			let isPendingUserResponse = false
			let isPendingEngineerResponse = false
			let hasEngineerResponse = false

			// Iterate over the timeline
			for (const event of timeline) {
				const typeBase = event.type.split('@')[0]

				// If the thread has re-opened then the we are waiting on action
				// from the agent and can break out of the loop
				if (typeBase === 'update' && event.name === THREAD_REOPEN_NAME) {
					break
				}

				if (typeBase === 'message' || typeBase === 'whisper') {
					// If the message contains the 'pendingagentresponse' tag, then we are
					// waiting on a response from the agent and can break out of the loop
					if (event.data.payload.message && event.data.payload.message.match(/#(<span>)?pendingagentresponse/gi)) {
						break
					}

					// If the message contains the 'pendinguserresponse' tag, then we are
					// waiting on a response from the user and can break out of the loop
					if (event.data.payload.message && event.data.payload.message.match(/#(<span>)?pendinguserresponse/gi)) {
						isPendingUserResponse = true
						break
					}

					// If the message contains the 'pendingengineerresponse' tag and its
					// been less than 24hours since the message was created, then we are
					// waiting on a response from an engineer and can break out of the loop
					if (
						!hasEngineerResponse &&
						event.data.payload.message &&
						event.data.payload.message.match(/#(<span>)?pendingengineerresponse/gi) &&
						new Date(event.data.timestamp).getTime() + ENGINEER_RESPONSE_TIMEOUT > Date.now()
					) {
						isPendingEngineerResponse = true
						break
					}

					// If we are still looping and the message came from a user/proxy then
					// we can simply break out of the loop
					const actor = await this.props.actions.getActor(event.data.actor)

					if (actor) {
						if (actor.proxy) {
							break
						}

						if (!actor.proxy) {
							hasEngineerResponse = true
						}
					} else {
						// If the actor can't be loaded, behave as if the message came from
						// a user. This means that we behave in a much safer way if the user
						// can't be loaded for some reason, as it will prevent
						// "pendinguserresponse" threads from being hidden if they have
						// a response.
						break
					}
				}
			}

			if (isPendingEngineerResponse) {
				pendingEngineerResponse.push(card)
			} else if (isPendingUserResponse) {
				pendingUserResponse.push(card)
			} else {
				pendingAgentResponse.push(card)
			}
		})

		const segments = [
			{
				name: 'All',
				cards: tail
			},
			{
				name: 'pending agent response',
				cards: timestampSort(pendingAgentResponse)
			},
			{
				name: 'pending user response',
				cards: timestampSort(pendingUserResponse)
			},
			{
				name: 'pending engineer response',
				cards: timestampSort(pendingEngineerResponse)
			},
			{
				name: 'discussions',
				cards: timestampSort(discussions)
			}
		]

		this.setState({
			segments
		})
	}

	setActiveIndex (index) {
		const target = _.get(this.props, [ 'channel', 'data', 'head', 'id' ])
		this.props.actions.setLensState(SLUG, target, {
			activeIndex: index
		})
	}

	render () {
		const threadTargets = _.map(this.props.channels, 'data.target')

		const {
			segments
		} = this.state

		return (
			<Column data-test={`lens--${SLUG}`} overflowY>
				<StyledTabs
					activeIndex={this.props.lensState.activeIndex}
					onActive={this.setActiveIndex}
					style={{
						height: '100%',
						display: 'flex',
						flexDirection: 'column'
					}}
				>
					{segments.map((segment) => {
						return (
							<Tab key={segment.name} title={`${segment.name} (${segment.cards.length})`}>
								<InfiniteList
									bg="#f8f9fd"
									key={segment.name}
									onScrollEnding={this.handleScrollEnding}
									style={{
										flex: 1,
										height: '100%',
										paddingBottom: 16
									}}
								>
									{!(this.props.totalPages > this.props.page + 1) && segment.cards.length === 0 && (
										<Box p={3}>
											<strong data-test="alt-text--no-support-threads">
												Good job! There are no support threads here
											</strong>
										</Box>
									)}

									{_.map(segment.cards, (card) => {
										const timeline = _.sortBy(
											_.get(card.links, [ 'has attached element' ], []),
											'data.timestamp'
										)

										return (
											<CardChatSummary
												displayOwner
												getActor={this.props.actions.getActor}
												key={card.id}
												active={
													_.includes(threadTargets, card.slug) || _.includes(threadTargets, card.id)
												}
												card={card}
												timeline={timeline}
												highlightedFields={[ 'data.status', 'data.inbox' ]}
												to={helpers.appendToChannelPath(this.props.channel, card)}
											/>
										)
									})}

									{this.props.totalPages > this.props.page + 1 && (
										<Box p={3}>
											<Icon spin name="cog"/>
										</Box>
									)}
								</InfiniteList>
							</Tab>
						)
					})}
				</StyledTabs>
			</Column>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, [ 'channel', 'data', 'head', 'id' ])
	return {
		channels: selectors.getChannels(state),
		lensState: selectors.getLensState(state, SLUG, target)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'getActor',
				'setLensState'
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
		label: 'Support threads list',
		icon: 'address-card',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThreads),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					},
					type: {
						type: 'string',
						enum: [
							'support-thread@1.0.0',
							'sales-thread@1.0.0'
						]
					},
					data: {
						type: 'object',
						properties: {
							status: {
								type: 'string'
							}
						}
					}
				},
				required: [
					'type',
					'data'
				]
			}
		},
		queryOptions: {
			limit: 100,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}
export default lens
