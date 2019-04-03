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
import * as store from '../../core/store'
import * as helpers from '../../services/helpers'
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
			const newChannel = helpers.createChannel({
				cardType: card.type,
				target,
				head: card,
				parentChannel: this.props.channel.id
			})
			this.props.actions.addChannel(newChannel)
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
			const timestamps = _.map(element.links['has attached element'], 'data.timestamp')
			timestamps.sort()
			return _.last(timestamps)
		}).reverse()

		const pendingAgentResponse = []
		const pendingUserResponse = []

		for (const card of tail) {
			const timeline = _.sortBy(card.links['has attached element'], 'data.timestamp')
			const messages = _.filter(timeline, [ 'type', 'message' ])
			const actor = storeHelpers.getActor(_.get(_.last(messages), [ 'data', 'actor' ]))
			if (actor.proxy) {
				pendingAgentResponse.push(card)
			} else {
				pendingUserResponse.push(card)
			}
		}

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
												card={card}
												openChannel={this.openChannel}
											/>
										)
									})}

									{this.props.totalPages > this.props.page + 1 && (
										<Box p={3}>
											<Icon name="cog fa-spin"/>
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
		allUsers: store.selectors.getAllUsers(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
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
