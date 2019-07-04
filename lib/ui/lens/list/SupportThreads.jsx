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
import {
	Box,
	Tab,
	Tabs
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../core'
import Column from '../../shame/Column'
import Icon from '../../shame/Icon'
import CardChatSummary from '../../components/CardChatSummary'

const SLUG = 'lens-support-threads'

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
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			segments: []
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

		this.bindScrollArea = this.bindScrollArea.bind(this)
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

			// Sort the timeline by timestamp rathern than created_at as they might
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
				if (event.type === 'message' || event.type === 'whisper') {
					// If the message contains the 'pendingagentresponse' tag, then we are
					// waiting on a response from the agent and can break out of the loop
					if (event.data.payload.message && event.data.payload.message.match(/#pendingagentresponse/gi)) {
						break
					}

					// If the message contains the 'pendinguserresponse' tag, then we are
					// waiting on a response from the user and can break out of the loop
					if (event.data.payload.message && event.data.payload.message.match(/#pendinguserresponse/gi)) {
						isPendingUserResponse = true
						break
					}

					// If the message contains the 'pendinguserresponse' tag, then we are
					// waiting on a response from the user and can break out of the loop
					if (
						!hasEngineerResponse &&
						event.data.payload.message &&
						event.data.payload.message.match(/#pendingengineerresponse/gi)
					) {
						isPendingEngineerResponse = true
						break
					}

					// If we are still looping and the message came from a user/proxy then
					// we can simply break out of the loop
					const actor = await this.props.actions.getActor(event.data.actor)

					if (actor.proxy) {
						break
					}

					if (!actor.proxy) {
						hasEngineerResponse = true
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

	bindScrollArea (ref) {
		this.scrollArea = ref
	}

	render () {
		const threadTargets = _.map(this.props.channels, 'data.target')

		const {
			segments
		} = this.state

		return (
			<Column data-test={`lens--${SLUG}`}>
				<Tabs
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
							<Tab key={segment.name} title={segment.name}>
								<div
									ref={this.bindScrollArea}
									key={segment.name}
									onScroll={this.handleScroll}
									style={{
										height: '100%',
										paddingBottom: 16,
										overflowY: 'auto'
									}}
								>
									{!(this.props.totalPages > this.props.page + 1) && segment.cards.length === 0 && (
										<Box p={3}><strong>Good job! There are no support threads here</strong></Box>
									)}

									{_.map(segment.cards, (card) => {
										return (
											<CardChatSummary
												getActor={this.props.actions.getActor}
												key={card.id}
												active={
													_.includes(threadTargets, card.slug) || _.includes(threadTargets, card.id)
												}
												card={card}
												channel={this.props.channel}
											/>
										)
									})}

									{this.props.totalPages > this.props.page + 1 && (
										<Box p={3}>
											<Icon spin name="cog"/>
										</Box>
									)}
								</div>
							</Tab>
						)
					})}
				</Tabs>
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
