/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	commaListsAnd
} = require('common-tags')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const styled = require('styled-components').default
const uuid = require('uuid/v4')
const Event = require('../components/Event').default
const {
	actionCreators,
	analytics,
	sdk,
	selectors
} = require('../core')
const helpers = require('../services/helpers')
const AutocompleteTextarea = require('../shame/AutocompleteTextarea')
const Column = require('../shame/Column').default
const Icon = require('../shame/Icon')
const messageSymbolRE = /^\s*%\s*/

const TypingNotice = styled.div `
	background: white;
	transform: translateY(-10px);
	height: 0;
	overflow: visible;
	> * {
		display: inline-block;
		border-radius: 3px;
		padding: 0 5px;
		box-shadow: rgba(0,0,0,0.25) 0px 0px 3px;
	}
`

// Default renderer for a card and a timeline
class TimelineRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true

		this.signalTyping = _.throttle(() => {
			this.props.actions.signalTyping(this.props.card.id)
		}, 1500)

		this.handleNewMessageChange = (event) => {
			this.signalTyping()
			const newMessage = event.target.value
			const messageSymbol = !this.props.allowWhispers || Boolean(newMessage.match(messageSymbolRE))
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
			const type = this.props.allowWhispers ? 'whisper' : 'message'
			const file = _.first(event.target.files)
			const message = {
				target: this.props.card,
				tags: [],
				type,
				payload: {
					file
				}
			}
			sdk.event.create(message)
				.then(() => {
					analytics.track('element.create', {
						element: {
							type
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
			whisper: Boolean(this.props.allowWhispers),
			messageSymbol: false,
			pendingMessages: []
		}

		this.handleCardVisible = this.handleCardVisible.bind(this)
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

	addMessage (event) {
		event.preventDefault()
		const {
			newMessage
		} = this.state
		const {
			allowWhispers,
			allUsers
		} = this.props
		if (!newMessage) {
			return
		}
		this.setState({
			newMessage: '',

			// If the timeline allows whispers, set the "whisper" state back to true,
			// resetting the message input to whisper mode and helping to prevent
			// accidental public responses
			whisper: allowWhispers,
			messageSymbol: false
		})
		const mentions = helpers.getUserIdsByPrefix('@', newMessage, allUsers)
		const alerts = helpers.getUserIdsByPrefix('!', newMessage, allUsers)
		const tags = helpers.findWordsByPrefix('#', newMessage).map((tag) => {
			return tag.slice(1).toLowerCase()
		})
		const whisper = allowWhispers && this.state.messageSymbol ? false : this.state.whisper
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
				data: {
					actor: this.props.user.id,
					payload: message.payload,
					target: this.props.card.id
				}
			})
		})

		sdk.event.create(message)
			.then(() => {
				analytics.track('element.create', {
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
			allowWhispers,
			tail,
			usersTyping
		} = this.props
		const whisper = allowWhispers && this.state.messageSymbol ? false : this.state.whisper
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

		let typingMessage = null

		if (usersTyping.length === 1) {
			typingMessage = `${usersTyping[0].slice(5)} is typing...`
		} else if (usersTyping.length > 1) {
			const typing = usersTyping.map((slug) => {
				return slug.slice(5)
			})

			typingMessage = commaListsAnd `${typing} are typing...`
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
					<Icon.default spin name="cog"/>
				</rendition.Box>)}

				{(Boolean(sortedTail) && sortedTail.length > 0) && _.map(sortedTail, (card) => {
					return (
						<rendition.Box key={card.id}>
							<Event
								onCardVisible={this.handleCardVisible}
								card={card}
							/>
						</rendition.Box>
					)
				})}

				{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
					return (
						<rendition.Box key={item.slug}>
							<Event
								card={item}
							/>
						</rendition.Box>
					)
				})}
			</div>

			{typingMessage && (
				<TypingNotice>
					<rendition.Box bg="white" ml={3}>
						<em>{typingMessage}</em>
					</rendition.Box>
				</TypingNotice>
			)}

			{head && head.type !== 'view' &&
				<rendition.Flex
					style={{
						borderTop: '1px solid #eee'
					}}
					bg={whisper ? '#eee' : 'white'}
				>
					{allowWhispers && (
						<rendition.Button
							square
							plaintext
							onClick={this.toggleWhisper}
							data-test="timeline__whisper-toggle"
							tooltip={{
								placement: 'right',
								text: `Toggle response visibility (currently ${whisper ? 'private' : 'public'})`
							}}
						>
							<Icon.default name={whisper ? 'eye-slash' : 'eye'}/>
						</rendition.Button>
					)}

					<rendition.Box
						flex="1"
						pt={3}
						pb={2}
						pr={3}
						pl={allowWhispers ? 0 : 3}
					>
						<AutocompleteTextarea.default
							user={this.props.user}
							className="new-message-input"
							value={this.state.newMessage}
							onChange={this.handleNewMessageChange}
							onTextSubmit={this.handleNewMessageSubmit}
							placeholder={whisper ? 'Type your private comment...' : 'Type your public reply...'}
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
exports.Renderer = TimelineRenderer
const mapStateToProps = (state, ownProps) => {
	const card = ownProps.card

	return {
		allUsers: selectors.getAllUsers(state),
		user: selectors.getCurrentUser(state),
		usersTyping: selectors.getUsersTypingOnCard(state, card.id)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'signalTyping'
			]), dispatch)
	}
}
const lens = {
	slug: 'lens-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(TimelineRenderer),

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
