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
	bindActionCreators
} from 'redux'
import {
	Box
} from 'rendition'
import Event from '../components/Event'
import {
	actionCreators,
	selectors
} from '../core'
import Icon from '../shame/Icon'
import Column from '../shame/Column'

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
			loadingPage: false
		}

		this.handleScroll = this.handleScroll.bind(this)
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
				'addChannel'
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
