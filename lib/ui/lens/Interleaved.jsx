
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
const uuid = require('uuid/v4')
const Event = require('../components/Event')
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const Icon = require('../shame/Icon')

const Column = require('../shame/Column').default

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update'
]

const getTargetId = (card) => {
	return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id
}

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
		this.openChannel = (target, card) => {
			// If a card is not provided, see if a matching card can be found from this
			// component's state/props
			const newChannel = helpers.createChannel({
				target,
				cardType: card.type,
				parentChannel: this.props.channel.id
			})
			this.props.actions.addChannel(newChannel)
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
			const schema = helpers.getViewSchema(head)
			if (!schema) {
				console.warn('.addThread() called, but there is no view schema available')
				return
			}
			const cardData = helpers.getUpdateObjectFromSchema(schema)
			cardData.slug = `thread-${uuid()}`
			cardData.type = 'thread'
			if (!cardData.data) {
				cardData.data = {}
			}
			this.setState({
				creatingCard: true
			})
			core.sdk.card.create(cardData)
				.then((thread) => {
					if (thread) {
						this.openChannel(thread.id, thread)
					}
					return null
				})
				.then(() => {
					core.analytics.track('element.create', {
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
	render () {
		const {
			head
		} = this.props.channel.data
		const channelTarget = this.props.channel.data.target
		const {
			messagesOnly
		} = this.state
		const tail = this.props.tail || null

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
					<rendition.Box p={3}>
						<Icon.default name="cog fa-spin"/>
					</rendition.Box>

					{(Boolean(tail) && tail.length > 0) && _.map(tail, (card) => {
						if (messagesOnly && isHiddenEventType(card.type)) {
							return null
						}
						return (
							<rendition.Box key={card.id}>
								<Event.Event
									openChannel={getTargetId(card) === channelTarget ? false : this.openChannel}
									card={card}
								/>
							</rendition.Box>
						)
					})}
				</div>

				{head && head.slug !== 'view-my-alerts' && head.slug !== 'view-my-mentions' && (
					<rendition.Flex
						p={3}
						style={{
							borderTop: '1px solid #eee'
						}}
						justify="flex-end"
					>
						<rendition.Button
							className="btn--add-thread"
							success={true}
							onClick={this.addThread}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon.default name="cog fa-spin"/>}
							{!this.state.creatingCard && 'Add a Chat thread'}
						</rendition.Button>
					</rendition.Flex>
				)}
			</Column>
		)
	}
}
exports.Interleaved = Interleaved
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
	slug: 'lens-interleaved',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		icon: 'address-card',
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
		}
	}
}
exports.default = lens
