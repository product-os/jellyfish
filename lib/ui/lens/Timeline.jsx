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
const redux = require('redux')
const rendition = require('rendition')
const Event = require('../components/Event').default
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const AutocompleteTextarea = require('../shame/AutocompleteTextarea')
const Icon = require('../shame/Icon')
const Column = require('../shame/Column').default

const getTargetId = (card) => {
	return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id
}

// Default renderer for a card and a timeline
class Renderer extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true
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
			this.props.actions.loadChannelData(newChannel)
		}
		this.handleNewMessageChange = (event) => {
			this.setState({
				newMessage: event.target.value
			})
		}
		this.handleNewMessageSubmit = (event) => {
			this.addMessage(event)
		}
		this.handleEventToggle = () => {
			this.setState({
				messagesOnly: !this.state.messagesOnly
			})
		}
		this.handleUploadButtonClick = () => {
			const element = this.fileInputElement
			if (element) {
				element.click()
			}
		}
		this.handleFileChange = (event) => {
			const file = _.first(event.target.files)
			const message = {
				target: this.props.card,
				tags: [],
				type: 'message',
				payload: {
					file
				}
			}
			core.sdk.event.create(message)
				.then(() => {
					core.analytics.track('element.create', {
						element: {
							type: 'message'
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true
		}
	}
	componentDidMount () {
		this.shouldScroll = true
		this.scrollToBottom()
	}
	componentWillUpdate () {
		const {
			scrollArea
		} = this
		if (scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = scrollArea.scrollTop >= scrollArea.scrollHeight - scrollArea.offsetHeight
		}
	}
	componentDidUpdate () {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom()
	}
	scrollToBottom () {
		if (!this.scrollArea) {
			return
		}
		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight
		}
	}
	addMessage (event) {
		event.preventDefault()
		const {
			newMessage
		} = this.state
		if (!newMessage) {
			return
		}
		this.setState({
			newMessage: ''
		})
		const {
			allUsers
		} = this.props
		const mentions = helpers.getUserIdsByPrefix('@', newMessage, allUsers)
		const alerts = helpers.getUserIdsByPrefix('!', newMessage, allUsers)
		const tags = helpers.findWordsByPrefix('#', newMessage).map((tag) => {
			return tag.slice(1)
		})
		const message = {
			target: this.props.card,
			type: 'message',
			tags,
			payload: {
				mentionsUser: mentions,
				alertsUser: alerts,
				message: newMessage
			}
		}
		core.sdk.event.create(message)
			.then(() => {
				core.analytics.track('element.create', {
					element: {
						type: 'message'
					}
				})
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error)
			})
	}
	render () {
		const head = this.props.card
		const {
			card,
			tail
		} = this.props
		const props = _.omit(this.props, [ 'card', 'action', 'allUsers', 'tail', 'type', 'user' ])
		const channelTarget = card.id
		const {
			messagesOnly
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id')
		if (messagesOnly) {
			_.remove(sortedTail, (item) => {
				return item.type !== 'message' && item.type !== 'whisper'
			})
		}
		return (<Column {...props}>
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
				style={{
					flex: 1,
					overflowY: 'auto',
					borderTop: '1px solid #eee',
					paddingTop: 8
				}}
			>
				{!sortedTail && (<rendition.Box p={3}>
					<Icon.default name="cog fa-spin"/>
				</rendition.Box>)}

				{(Boolean(sortedTail) && sortedTail.length > 0) && _.map(sortedTail, (item) => {
					return (
						<rendition.Box key={item.id}>
							<Event
								openChannel={getTargetId(item) === channelTarget ? false : this.openChannel}
								card={item}
							/>
						</rendition.Box>
					)
				})}
			</div>

			{head && head.type !== 'view' &&
				<rendition.Flex
					style={{
						borderTop: '1px solid #eee'
					}}
				>
					<rendition.Box flex="1" px={3} pt={3} pb={2}>
						<AutocompleteTextarea.default
							className="new-message-input"
							value={this.state.newMessage}
							onChange={this.handleNewMessageChange}
							onTextSubmit={this.handleNewMessageSubmit}
							placeholder="Type to comment on this thread..."
						/>
						<rendition.Txt
							style={{
								textAlign: 'right',
								opacity: 0.75
							}}
							fontSize={11}
						>
							Press shift + enter to send
						</rendition.Txt>
					</rendition.Box>

					<rendition.Button square mr={3} mt={3} onClick={this.handleUploadButtonClick}>
						<Icon.default name="image"/>
					</rendition.Button>

					<input
						style={{
							display: 'none'
						}}
						type="file"
						ref={(el) => {
							this.fileInputElement = el
						}}
						onChange={this.handleFileChange}
					/>
				</rendition.Flex>
			}

		</Column>)
	}
}
exports.Renderer = Renderer
const mapStateToProps = (state) => {
	return {
		allUsers: store.selectors.getAllUsers(state),
		user: store.selectors.getCurrentUser(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
const lens = {
	slug: 'lens-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Renderer),

		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time'
							},
							actor: {
								type: 'string',
								format: 'uuid'
							},
							payload: {
								type: 'object'
							}
						},
						required: [
							'timestamp',
							'actor'
						]
					}
				}
			}
		}
	}
}
exports.default = lens
