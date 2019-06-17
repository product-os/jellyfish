/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
import _ from 'lodash'
import path from 'path'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	withRouter
} from 'react-router-dom'
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
			this.props.history.push(
				path.join(window.location.pathname, target)
			)
		}

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			loadingPage: false,
			markingAllAsRead: false
		}

		this.bindScrollArea = this.bindScrollArea.bind(this)
		this.handleScroll = this.handleScroll.bind(this)
		this.markAllAsRead = this.markAllAsRead.bind(this)
	}

	async setCardRead (card) {
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

	async handleCardRead (event) {
		const id = event.target.dataset.cardid

		const card = _.find(this.props.tail, {
			id
		})

		this.setCardRead(card)
	}

	async markAllAsRead () {
		this.setState({
			markingAllAsRead: true
		})

		try {
			const cards = await sdk.query(INBOX_VIEW_SLUG)

			await Bluebird.map(cards, (card) => {
				return this.setCardRead(card)
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

	bindScrollArea (ref) {
		this.scrollArea = ref
	}

	render () {
		const {
			markingAllAsRead
		} = this.state

		let tail = this.props.tail ? this.props.tail.slice() : null

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
					ref={this.bindScrollArea}
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
											data-cardid={card.id}
											onClick={this.handleCardRead}
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
		renderer: withRouter(connect(mapStateToProps, mapDispatchToProps)(Inbox)),
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
