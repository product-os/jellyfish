/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	commaListsAnd
} from 'common-tags'
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
	Flex,
	Theme
} from 'rendition'
import styled from 'styled-components'
import uuid from 'uuid/v4'
import Event from '../components/Event'
import {
	actionCreators,
	analytics,
	sdk,
	selectors
} from '../core'
import helpers from '../services/helpers'
import AutocompleteTextarea from '../shame/AutocompleteTextarea'
import Column from '../shame/Column'
import Icon from '../shame/Icon'

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

class TimelineRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			whisper: Boolean(this.props.allowWhispers),
			messageSymbol: false,
			pendingMessages: []
		}

		this.handleCardVisible = this.handleCardVisible.bind(this)
		this.toggleWhisper = this.toggleWhisper.bind(this)
		this.handleFileChange = this.handleFileChange.bind(this)
		this.handleUploadButtonClick = this.handleUploadButtonClick.bind(this)
		this.handleEventToggle = this.handleEventToggle.bind(this)
		this.handleNewMessageSubmit = this.handleNewMessageSubmit.bind(this)
		this.handleNewMessageChange = this.handleNewMessageChange.bind(this)

		this.signalTyping = _.throttle(() => {
			this.props.actions.signalTyping(this.props.card.id)
		}, 1500)
	}

	handleNewMessageChange (event) {
		this.signalTyping()
		const newMessage = event.target.value
		const messageSymbol = !this.props.allowWhispers || Boolean(newMessage.match(messageSymbolRE))
		this.setState({
			newMessage,
			messageSymbol
		})
	}

	handleNewMessageSubmit (event) {
		this.addMessage(event)
	}

	handleEventToggle () {
		this.setState({
			messagesOnly: !this.state.messagesOnly
		})
	}

	toggleWhisper () {
		this.setState({
			whisper: !this.state.whisper
		})
	}

	handleUploadButtonClick () {
		const element = this.fileInputElement
		if (element) {
			element.click()
		}
	}

	handleFileChange (event) {
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

		return (
			<Column>
				<Flex my={2} mr={2} justify="flex-end">
					<Button
						plaintext
						tooltip={{
							placement: 'left',
							text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`
						}}
						className="timeline__checkbox--additional-info"
						color={messagesOnly ? Theme.colors.text.light : false}
						ml={2}
						onClick={this.handleEventToggle}
					>
						<Icon name="stream"/>
					</Button>
				</Flex>

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
					{!sortedTail && (<Box p={3}>
						<Icon spin name="cog"/>
					</Box>)}

					{(Boolean(sortedTail) && sortedTail.length > 0) && _.map(sortedTail, (card) => {
						return (
							<Box key={card.id}>
								<Event
									onCardVisible={this.handleCardVisible}
									card={card}
								/>
							</Box>
						)
					})}

					{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
						return (
							<Box key={item.slug}>
								<Event
									card={item}
								/>
							</Box>
						)
					})}
				</div>

				{typingMessage && (
					<TypingNotice data-test="typing-notice">
						<Box bg="white" ml={3}>
							<em>{typingMessage}</em>
						</Box>
					</TypingNotice>
				)}

				{head && head.type !== 'view' &&
					<Flex
						style={{
							borderTop: '1px solid #eee'
						}}
						bg={whisper ? '#eee' : 'white'}
					>
						{allowWhispers && (
							<Button
								square
								plaintext
								onClick={this.toggleWhisper}
								data-test="timeline__whisper-toggle"
								tooltip={{
									placement: 'right',
									text: `Toggle response visibility (currently ${whisper ? 'private' : 'public'})`
								}}
							>
								<Icon name={whisper ? 'eye-slash' : 'eye'}/>
							</Button>
						)}

						<Box
							flex="1"
							pt={3}
							pb={2}
							pr={3}
							pl={allowWhispers ? 0 : 3}
						>
							<AutocompleteTextarea
								user={this.props.user}
								className="new-message-input"
								value={this.state.newMessage}
								onChange={this.handleNewMessageChange}
								onTextSubmit={this.handleNewMessageSubmit}
								placeholder={whisper ? 'Type your private comment...' : 'Type your public reply...'}
							/>
						</Box>

						<Button
							square
							mr={3}
							mt={3}
							onClick={this.handleUploadButtonClick}
						>
							<Icon name="image"/>
						</Button>

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
					</Flex>
				}
			</Column>
		)
	}
}

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
		actions: bindActionCreators(
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

export default lens
