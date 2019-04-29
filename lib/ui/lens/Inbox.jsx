/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const reactResizeObserver = require('react-resize-observer')
const redux = require('redux')
const rendition = require('rendition')
const Event = require('../components/Event').default
const {
	actionCreators,
	sdk,
	selectors
} = require('../core')
const Icon = require('../shame/Icon')

const Column = require('../shame/Column').default

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update'
]

const isHiddenEventType = (type) => {
	return _.includes(NONE_MESSAGE_TIMELINE_TYPES, type)
}

class Interleaved extends React.Component {
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
			this.props.actions.addChannel({
				target,
				parentChannel: this.props.channel.id
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
		const userSlug = this.props.user.slug
		if (card.type === 'message' || card.type === 'whisper') {
			const message = _.get(card, [ 'data', 'payload', 'message' ], '')

			// Only continue if the message mentions the current user
			if (message.includes(`@${userSlug.slice(5)}`) || message.includes(`!${userSlug.slice(5)}`)) {
				const readBy = _.get(card, [ 'data', 'readBy' ], [])

				if (!_.includes(readBy, userSlug)) {
					readBy.push(userSlug)

					card.data.readBy = readBy

					sdk.card.update(card.id, card)
						.catch((error) => {
							console.error(error)
						})
				}
			}
		}
	}

	render () {
		const {
			messagesOnly
		} = this.state

		let tail = this.props.tail ? this.props.tail.slice() : null

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

		return (
			<Column
				flex="1"
				style={{
					position: 'relative'
				}}
			>
				<reactResizeObserver.default onResize={this.scrollToBottom}/>
				<rendition.Flex my={2} mr={2} justify="flex-end">
					<rendition.Button
						plaintext
						tooltip={{
							placement: 'left',
							text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`
						}}
						className="timeline__checkbox--additional-info"
						color={messagesOnly ? rendition.Theme.colors.text.light : false}
						ml={2}
						onClick={this.handleEventToggle}
					>
						<Icon.default name="stream"/>
					</rendition.Button>
				</rendition.Flex>

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
					{this.props.totalPages > this.props.page + 1 && (
						<rendition.Box p={3}>
							<Icon.default spin name="cog"/>
						</rendition.Box>
					)}

					{(Boolean(tail) && tail.length > 0) && _.map(tail, (card) => {
						if (messagesOnly && isHiddenEventType(card.type)) {
							return null
						}
						return (
							<rendition.Box key={card.id}>
								<Event
									openChannel={this.openChannel}
									card={card}
								/>
							</rendition.Box>
						)
					})}
				</div>
			</Column>
		)
	}
}
exports.Interleaved = Interleaved

const mapStateToProps = (state) => {
	return {
		allUsers: selectors.getAllUsers(state),
		user: selectors.getCurrentUser(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
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
		renderer: connect(mapStateToProps, mapDispatchToProps)(Interleaved),
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
exports.default = lens
