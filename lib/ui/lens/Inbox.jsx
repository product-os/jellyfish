/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import Event from '../components/Event'
import {
	actionCreators,
	selectors,
	sdk
} from '../core'
import {
	ActionLink
} from '../shame/ActionLink'
import Icon from '../shame/Icon'
import Column from '../shame/Column'

const INBOX_VIEW_SLUG = 'view-my-inbox'

class Inbox extends React.Component {
	constructor (props) {
		super(props)

		this.loadingPage = false
		this.openChannel = (target) => {
			this.props.actions.addChannel({
				target,
				parentChannel: this.props.channel.id
			})
		}

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			loadingPage: false,
			markingAllAsRead: false
		}

		this.handleScroll = this.handleScroll.bind(this)

		this.markAllAsRead = this.markAllAsRead.bind(this)
	}

	async handleCardVisible (card) {
		const userSlug = this.props.user.slug
		if (card.type === 'message' || card.type === 'whisper') {
			const message = _.get(card, [ 'data', 'payload', 'message' ], '')

			// Only continue if the message mentions the current user
			if (message.includes(`@${userSlug.slice(5)}`) || message.includes(`!${userSlug.slice(5)}`)) {
				const readBy = _.get(card, [ 'data', 'readBy' ], [])

				if (!_.includes(readBy, userSlug)) {
					readBy.push(userSlug)

					card.data.readBy = readBy

					return sdk.card.update(card.id, card)
						.catch((error) => {
							console.error(error)
						})
				}
			}
		}

		return null
	}

	async markAllAsRead () {
		this.setState({
			markingAllAsRead: true
		})

		try {
			const cards = await sdk.query(INBOX_VIEW_SLUG)

			await Bluebird.map(cards, (card) => {
				return this.handleCardVisible(card)
			})
		} catch (error) {
			this.props.actions.addNotification('danger', error.message || error)
		}

		this.setState({
			markingAllAsRead: false
		})
	}

	async handleScroll () {
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

		if (this.scrollBottomOffset > 100) {
			return
		}

		this.loadingPage = true
		await this.props.setPage(this.props.page + 1)
		this.loadingPage = false
	}

	render () {
		let tail = this.props.tail ? this.props.tail.slice() : null
		const {
			markingAllAsRead
		} = this.state

		if (tail) {
			tail = _.sortBy(tail, 'created_at')
			tail.reverse()
		}

		return (
			<Column
				flex="1"
				style={{
					position: 'relative'
				}}
			>
				<Flex
					justifyContent="flex-end"
					px={3}
					pb={3}
				>
					<Button
						onClick={this.markAllAsRead}
						disabled={markingAllAsRead || tail.length === 0}
					>
						{markingAllAsRead
							? <Icon name="cog" spin />
							: 'Mark all as read'
						}
					</Button>
				</Flex>

				<div
					ref={(ref) => {
						this.scrollArea = ref
					}}
					onScroll={this.handleScroll}
					style={{
						flex: 1,
						overflowY: 'auto',
						borderTop: '1px solid #eee',
						paddingTop: 8
					}}
				>
					{(Boolean(tail) && tail.length > 0) && _.map(tail, (card) => {
						return (
							<Box key={card.id}>
								<Event
									user={this.props.user}
									openChannel={this.openChannel}
									card={card}
									menuOptions={(
										<ActionLink
											onClick={() => {
												this.handleCardVisible(card)
											}}
										>
											Mark as read
										</ActionLink>
									)}
								/>
							</Box>
						)
					})}

					{this.props.totalPages > this.props.page + 1 && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}
				</div>
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: 'lens-inbox',
	type: 'lens',
	version: '1.0.0',
	name: 'Inbox lens',
	data: {
		icon: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Inbox),
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
			sortDir: 'desc'
		}
	}
}

export default lens
