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
const uuid = require('uuid/v4')
const Event = require('../../components/Event').default
const core = require('../../core')
const store = require('../../core/store')
const helpers = require('../../services/helpers')
const AutocompleteTextarea = require('../../shame/AutocompleteTextarea')
const Column = require('../../shame/Column').default
const Icon = require('../../shame/Icon')
const messageSymbolRE = /^\s*%\s*/

const getTargetId = (card) => {
	return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id
}

// Default renderer for a card and a timeline
class SupportThreadTimelineRenderer extends React.Component {
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
			const newMessage = event.target.value
			const messageSymbol = Boolean(newMessage.match(messageSymbolRE))
			this.setState({
				newMessage,
				messageSymbol
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
				type: 'whisper',
				data: {
					timestamp: helpers.getCurrentTimestamp(),
					actor: this.props.user.id,
					payload: {
						file
					}
				}
			}
			core.sdk.card.create(message)
				.then(() => {
					core.analytics.track('element.create', {
						element: {
							type: 'whisper'
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.toggleWhisper = () => {
			this.setState({
				whisper: !this.state.whisper
			})
		}
		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			whisper: true,
			messageSymbol: false,
			pendingMessages: []
		}
	}
	componentWillReceiveProps (nextProps) {
		const {
			pendingMessages
		} = this.state

		if (pendingMessages.length) {
			const stillPending = pendingMessages.filter((item) => {
				const match = _.find(nextProps.tail, {
					slug: item.slug
				})
				return !match
			})

			this.setState({
				pendingMessages: stillPending
			})
		}
	}
	componentDidMount () {
		this.shouldScroll = true
		this.scrollToBottom()
	}
	componentWillUpdate () {
		if (this.scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = this.scrollArea.scrollTop >= this.scrollArea.scrollHeight - this.scrollArea.offsetHeight
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
			newMessage: '',

			// Set the "whisper" state back to true, resetting the message input to
			// whisper mode and helping to prevent accidental public responses
			whisper: true,
			messageSymbol: false
		})
		const {
			allUsers
		} = this.props
		const mentions = helpers.getUserIdsByPrefix('@', newMessage, allUsers)
		const alerts = helpers.getUserIdsByPrefix('!', newMessage, allUsers)
		const tags = helpers.findWordsByPrefix('#', newMessage).map((tag) => {
			return tag.slice(1)
		})
		const whisper = this.state.messageSymbol ? false : this.state.whisper
		const message = {
			target: this.props.card,
			type: whisper ? 'whisper' : 'message',
			slug: `${whisper ? 'whisper' : 'message'}-${uuid()}`,
			tags,
			payload: {
				mentionsUser: mentions,
				alertsUser: alerts,
				message: newMessage.replace(messageSymbolRE, '')
			}
		}

		// Synthesize the event card and add it to the pending messages so it can be
		// rendered in advance of the API request completing it
		this.setState({
			pendingMessages: this.state.pendingMessages.concat({
				pending: true,
				type: message.type,
				tags,
				slug: message.slug,
				links: {
					'is attached to': [ this.props.card ]
				},
				data: {
					actor: this.props.user.id,
					payload: message.payload
				}
			})
		})

		core.sdk.event.create(message)
			.then(() => {
				core.analytics.track('element.create', {
					element: {
						type: message.type
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
			tail
		} = this.props
		const channelTarget = this.props.card.id
		const whisper = this.state.messageSymbol ? false : this.state.whisper
		const {
			messagesOnly,
			pendingMessages
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id')
		if (messagesOnly) {
			_.remove(sortedTail, (card) => {
				return card.type !== 'message' && card.type !== 'whisper'
			})
		}
		return (<Column>
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

				{(Boolean(sortedTail) && sortedTail.length > 0) && _.map(sortedTail, (card) => {
					return (
						<rendition.Box key={card.id}>
							<Event
								openChannel={getTargetId(card) === channelTarget ? false : this.openChannel}
								card={card}
							/>
						</rendition.Box>
					)
				})}

				{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
					return (
						<rendition.Box key={item.slug}>
							<Event
								openChannel={false}
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
					bg={whisper ? '#eee' : 'white'}
				>
					<rendition.Button
						square
						plaintext
						onClick={this.toggleWhisper}
						data-test="support-thread-timeline__whisper-toggle"
					>
						<Icon.default name={whisper ? 'eye-slash' : 'eye'}/>
					</rendition.Button>

					<rendition.Box
						flex="1"
						pt={3}
						pb={2}
						pr={3}
					>
						<AutocompleteTextarea.default
							user={this.props.user}
							className="new-message-input"
							value={this.state.newMessage}
							onChange={this.handleNewMessageChange}
							onTextSubmit={this.handleNewMessageSubmit}
							placeholder={whisper ? 'Type your comment...' : 'Type your reply...'}
						/>
					</rendition.Box>

					<rendition.Button
						square
						mr={3}
						mt={3}
						onClick={this.handleUploadButtonClick}
					>
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
exports.Renderer = SupportThreadTimelineRenderer
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
	slug: 'lens-support-thread-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThreadTimelineRenderer),

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
