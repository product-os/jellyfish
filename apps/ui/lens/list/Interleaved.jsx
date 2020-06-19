/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import path from 'path'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	withRouter
} from 'react-router-dom'
import ReactResizeObserver from 'react-resize-observer'
import {
	compose,
	bindActionCreators
} from 'redux'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import {
	v4 as uuid
} from 'uuid'
import Event from '../../../../lib/ui-components/Event'
import {
	actionCreators,
	analytics,
	sdk,
	selectors
} from '../../core'
import Column from '../../../../lib/ui-components/shame/Column'
import Icon from '../../../../lib/ui-components/shame/Icon'
import {
	withDefaultGetActorHref
} from '../../../../lib/ui-components/HOC/with-default-get-actor-href'
import EventsContainer from '../../../../lib/ui-components/EventsContainer'
import BaseLens from '../common/BaseLens'

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update',
	'create@1.0.0',
	'event@1.0.0',
	'update@1.0.0',
	'thread@1.0.0'
]

const isHiddenEventType = (type) => {
	return _.includes(NONE_MESSAGE_TIMELINE_TYPES, type)
}

// TODO: remove once we can retrieve this data during query
const isFirstInThread = (card, firstMessagesByThreads) => {
	const target = _.get(card, [ 'data', 'target' ])
	const firstInThread = firstMessagesByThreads[target]
	if (!firstInThread) {
		firstMessagesByThreads[target] = card
		return true
	}
	return false
}

export class Interleaved extends BaseLens {
	constructor (props) {
		super(props)
		this.shouldScroll = true
		this.loadingPage = false
		this.scrollBottomOffset = 0
		this.scrollToBottom = () => {
			if (!this.scrollArea) {
				return
			}
			if (this.shouldScroll) {
				this.scrollArea.scrollTop = this.scrollArea.scrollHeight
			}
		}
		this.openChannel = (target) => {
			// Remove everything after the current channel, then append the target.
			const current = this.props.channel.data.target
			this.props.history.push(
				path.join(window.location.pathname.split(current)[0], current, target)
			)
		}
		this.addThread = (event) => {
			event.preventDefault()
			const {
				head
			} = this.props.channel.data
			if (!head) {
				console.warn('.addThread() called, but there is no head card')
				return
			}

			const cardData = this.getSeedData()

			cardData.slug = `thread-${uuid()}`
			cardData.type = 'thread'
			if (!cardData.data) {
				cardData.data = {}
			}
			this.setState({
				creatingCard: true
			})
			sdk.card.create(cardData)
				.then((thread) => {
					if (thread) {
						this.openChannel(thread.slug || thread.id)
					}
					return thread
				})
				.then((thread) => {
					// If a relationship is defined, link this thread using the
					// relationship
					const relationship = this.props.relationship
					if (thread && relationship) {
						sdk.card.link(thread, relationship.target, relationship.name)
					}
				})
				.then(() => {
					analytics.track('element.create', {
						element: {
							type: cardData.type
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message)
				})
				.finally(() => {
					this.setState({
						creatingCard: false
					})
				})
		}
		this.handleEventToggle = () => {
			this.setState({
				messagesOnly: !this.state.messagesOnly
			})
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
			if (scrollArea.scrollTop > 200) {
				return
			}
			this.loadingPage = true
			await this.props.setPage(this.props.page + 1)
			this.loadingPage = false
		}
		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			loadingPage: false
		}
		setTimeout(() => {
			return this.scrollToBottom()
		})
		this.handleCardVisible = this.handleCardVisible.bind(this)
		this.bindScrollArea = this.bindScrollArea.bind(this)
	}

	componentWillUpdate () {
		if (!this.scrollArea) {
			return
		}

		// Only set the scroll flag if the scroll area is already at the bottom
		this.shouldScroll = this.scrollArea.scrollTop >= this.scrollArea.scrollHeight - this.scrollArea.offsetHeight
	}

	componentDidUpdate (nextProps) {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom()
		if (nextProps.tail && this.props.tail &&
            (nextProps.tail.length !== this.props.tail.length)) {
			window.requestAnimationFrame(() => {
				const {
					scrollArea
				} = this
				if (!scrollArea) {
					return
				}
				scrollArea.scrollTop = scrollArea.scrollHeight - this.scrollBottomOffset - scrollArea.offsetHeight
			})
		}
	}

	handleCardVisible (card) {
		sdk.card.markAsRead(this.props.user.slug, card, _.map(_.filter(this.props.groups, 'isMine'), 'name'))
			.catch((error) => {
				console.error(error)
			})
	}

	bindScrollArea (ref) {
		this.scrollArea = ref
	}

	render () {
		const {
			head
		} = this.props.channel.data
		const {
			messagesOnly
		} = this.state

		let tail = this.props.tail ? this.props.tail.slice() : null
		const firstMessagesByThreads = {}

		// If tail has expanded links, interleave them in with the head cards
		_.forEach(tail, (card) => {
			_.forEach(card.links, (collection, verb) => {
				// If the $link property is present, the link hasn't been expanded, so
				// exit early
				if (collection[0] && collection[0].$link) {
					return
				}
				for (const item of collection) {
					// TODO: Due to a bug in links, its possible for an event to get
					// linked to a card twice, so remove any duplicates here
					if (
						!_.find(tail, {
							id: item.id
						})
					) {
						tail.push(item)
					}
				}
			})
		})

		tail = _.sortBy(tail, 'created_at')

		const eventActions = _.pick(this.props.actions, [ 'addNotification' ])

		return (
			<Column
				flex="1"
				style={{
					position: 'relative'
				}}
			>
				<ReactResizeObserver onResize={this.scrollToBottom}/>
				<EventsContainer
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
				>
					{this.props.totalPages > this.props.page + 1 && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}

					{(Boolean(tail) && tail.length > 0) && _.map(tail, (card, index) => {
						if (messagesOnly && isHiddenEventType(card.type)) {
							return null
						}
						return (
							<Box key={card.id}>
								<Event
									previousEvent={tail[index - 1]}
									nextEvent={tail[index + 1]}
									onCardVisible={this.handleCardVisible}
									openChannel={this.openChannel}
									user={this.props.user}
									groups={this.props.groups}
									card={card}
									firstInThread={isFirstInThread(card, firstMessagesByThreads)}
									selectCard={selectors.getCard}
									getCard={this.props.actions.getCard}
									actions={eventActions}
									getActorHref={this.props.getActorHref}
								/>
							</Box>
						)
					})}
				</EventsContainer>

				{head && head.slug !== 'view-my-alerts' && head.slug !== 'view-my-mentions' && (
					<Flex
						p={3}
						style={{
							borderTop: '1px solid #eee'
						}}
						justifyContent="flex-end"
					>
						<Button
							className="btn--add-thread"
							success={true}
							onClick={this.addThread}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon spin name="cog"/>}
							{!this.state.creatingCard && 'Add a Chat thread'}
						</Button>
					</Flex>
				)}
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'getCard'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: 'lens-interleaved',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		icon: 'list',
		format: 'list',
		renderer: compose(
			withRouter,
			connect(mapStateToProps, mapDispatchToProps),
			withDefaultGetActorHref()
		)(Interleaved),
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
			sortBy: 'created_at',
			sortDir: 'desc',

			// The interleaved lens is inerested in messages that are attached to the
			// main query resource. Here we invert the query so that we retrieve all
			// the messages attached to the main queried resource
			mask: (query) => {
				return {
					type: 'object',
					$$links: {
						'is attached to': query
					},
					properties: {
						active: {
							const: true,
							type: 'boolean'
						},
						type: {
							type: 'string',
							const: 'message@1.0.0'
						}
					},
					required: [
						'active',
						'type'
					],
					additionalProperties: true
				}
			}
		}
	}
}

export default lens
