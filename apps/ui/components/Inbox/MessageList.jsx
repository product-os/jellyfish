/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
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
	Box
} from 'rendition'
import {
	actionCreators,
	selectors,
	sdk
} from '../../core'
import {
	ActionLink
} from '@jellyfish/ui-components/shame/ActionLink'
import Column from '@jellyfish/ui-components/shame/Column'
import Event from '@jellyfish/ui-components/Event'

class MessageList extends React.Component {
	constructor (props) {
		super(props)

		this.loadingPage = false

		this.openChannel = (target) => {
			this.props.history.push(`/${target}`)
		}

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			loadingPage: false
		}

		this.bindScrollArea = this.bindScrollArea.bind(this)
		this.handleCardRead = this.handleCardRead.bind(this)
		this.handleCardUnread = this.handleCardUnread.bind(this)
		this.handleScroll = this.handleScroll.bind(this)
	}

	async handleCardRead (event) {
		const id = event.target.dataset.cardid

		const card = _.find(this.props.tail, {
			id
		})

		sdk.card.markAsRead(this.props.user.slug, card)
			.catch((error) => {
				console.error(error)
			})
	}

	async handleCardUnread (event) {
		const id = event.target.dataset.cardid

		const card = _.find(this.props.tail, {
			id
		})

		sdk.card.markAsUnread(this.props.user.slug, card)
			.catch((error) => {
				console.error(error)
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
				<div
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
					data-test={'messageList-ListWrapper'}
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
									getActor={this.props.actions.getActor}
									addNotification={this.props.actions.addNotification}
									menuOptions={_.includes(card.data.readBy, this.props.user.slug) ? (
										<ActionLink
											data-cardid={card.id}
											onClick={this.handleCardUnread}
										>
											Mark as unread
										</ActionLink>
									) : (
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
				'addNotification',
				'getActor'
			]),
			dispatch
		)
	}
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(MessageList))
