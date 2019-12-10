/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	commaListsAnd
} from 'common-tags'
import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import styled from 'styled-components'
import uuid from 'uuid/v4'
import Event from '../Event'
import Update from '../Update'
import * as helpers from '../../../apps/ui/services/helpers'
import Column from '@jellyfish/ui-components/shame/Column'
import Icon from '@jellyfish/ui-components/shame/Icon'
import MessageInput from './MessageInput'
import {
	withSetup
} from '../SetupProvider'

const messageSymbolRE = /^\s*%\s*/

/*
 * This message text is used when uploading a file so that syncing can be done
 * effectively without have to sync the entire file
 */
const FILE_PROXY_MESSAGE = '[](#jellyfish-hidden)A file has been uploaded using Jellyfish:'

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

const EventsContainer = styled(Box) `
	flex: 1;
	overflow-y: auto;
	border-top: 1px solid #eee;
	background-color: ${(props) => { return props.theme.colors.quartenary.light }}
`

const getSendCommand = (user) => {
	return _.get(user.data, [ 'profile', 'sendCommand' ], 'shift+enter')
}

const PAGE_SIZE = 20

class Timeline extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true

		this.state = {
			page: 1,
			hideWhispers: false,
			messageSymbol: false,
			messagesOnly: true,
			newMessage: this.props.timelineMessage,
			pendingMessages: [],
			showNewCardModal: false,
			whisper: Boolean(this.props.allowWhispers),
			uploadingFiles: []
		}

		this.bindScrollArea = this.bindScrollArea.bind(this)
		this.bindFileInput = this.bindFileInput.bind(this)
		this.handleCardVisible = this.handleCardVisible.bind(this)
		this.toggleWhisper = this.toggleWhisper.bind(this)
		this.handleFileChange = this.handleFileChange.bind(this)
		this.handleEventToggle = this.handleEventToggle.bind(this)
		this.handleJumpToTop = this.handleJumpToTop.bind(this)
		this.handleNewMessageSubmit = this.handleNewMessageSubmit.bind(this)
		this.handleNewMessageChange = _.debounce(this.handleNewMessageChange.bind(this), 100)
		this.handleWhisperToggle = this.handleWhisperToggle.bind(this)

		this.signalTyping = _.throttle(() => {
			this.props.signalTyping(this.props.card.id)
		}, 1500)

		this.preserveMessage = _.debounce((newMessage) => {
			this.props.setTimelineMessage(this.props.card.id, newMessage)
		}, 1500)

		this.handleScroll = this.handleScroll.bind(this)
	}

	handleJumpToTop (event) {
		event.preventDefault()

		this.setState({
			page: Infinity
		}, () => {
			this.scrollArea.scrollTop = 0
		})
	}

	handleNewMessageChange (event) {
		this.signalTyping()
		const newMessage = event.target.value
		const messageSymbol = !this.props.allowWhispers || Boolean(newMessage.match(messageSymbolRE))
		this.setState({
			newMessage,
			messageSymbol
		})

		this.preserveMessage(newMessage)
	}

	handleNewMessageSubmit (event) {
		this.addMessage(event)
	}

	handleEventToggle () {
		this.setState({
			messagesOnly: !this.state.messagesOnly
		})
	}

	handleWhisperToggle () {
		this.setState({
			hideWhispers: !this.state.hideWhispers
		})
	}

	toggleWhisper () {
		this.setState({
			whisper: !this.state.whisper
		})
	}

	handleFileChange (files) {
		const type = this.props.allowWhispers ? 'whisper' : 'message'
		const file = _.first(files)
		const message = {
			target: this.props.card,
			tags: [],
			type,
			slug: `${type}-${uuid()}`,
			payload: {
				file,
				message: `${FILE_PROXY_MESSAGE} ${helpers.createPermaLink(this.props.card)}`
			}
		}

		this.setState({
			uploadingFiles: this.state.uploadingFiles.concat(message.slug)
		})

		this.props.sdk.event.create(message)
			.then(() => {
				this.setState({
					uploadingFiles: _.without(this.state.uploadingFiles, message.slug)
				})

				this.props.analytics.track('element.create', {
					element: {
						type
					}
				})
			})
			.catch((error) => {
				this.props.addNotification('danger', error.message || error)
			})
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidMount () {
		this.shouldScroll = true
		this.scrollToBottom()
	}

	getSnapshotBeforeUpdate (nextProps, nextState) {
		if (this.scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = this.scrollArea.scrollTop >= this.scrollArea.scrollHeight - this.scrollArea.offsetHeight
		}

		const {
			tail
		} = this.props

		const {
			pendingMessages
		} = this.state

		if (tail.length !== nextProps.tail.length) {
			return pendingMessages.filter((item) => {
				const match = _.find(nextProps.tail, {
					slug: item.slug
				})
				return match
			})
		}

		return null
	}

	componentDidUpdate (prevProps, prevState, snapshot) {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom()
		if (
			this.scrollArea &&
			this.scrollBottomOffset &&
			this.scrollBottomOffset !== this.scrollArea.scrollHeight - this.scrollArea.offsetHeight - this.scrollArea.scrollTop
		) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight - (this.scrollArea.offsetHeight + this.scrollBottomOffset)
			this.scrollBottomOffset = this.scrollArea.scrollHeight - this.scrollArea.offsetHeight - this.scrollArea.scrollTop
		}

		if (snapshot) {
			this.setState({
				pendingMessages: snapshot
			})
		}
	}

	scrollToBottom () {
		if (!this.scrollArea) {
			return
		}
		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight
		}
	}

	handleScroll (event) {
		if (this.scrollArea) {
			this.scrollBottomOffset = this.scrollArea.scrollHeight - this.scrollArea.offsetHeight - this.scrollArea.scrollTop
		}

		if (
			this.scrollArea &&
			this.scrollArea.scrollTop < 250 &&
			this.state.page * PAGE_SIZE < this.props.tail.length
		) {
			this.setState({
				page: this.state.page + 1
			})
		}
	}

	handleCardVisible (card) {
		this.props.sdk.card.markAsRead(this.props.user.slug, card)
			.catch((error) => {
				console.error(error)
			})
	}

	addMessage (event) {
		event.preventDefault()
		const {
			newMessage
		} = this.state
		const {
			allowWhispers
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
		this.props.setTimelineMessage(this.props.card.id, '')
		const mentions = helpers.getUserSlugsByPrefix('@', newMessage)
		const alerts = helpers.getUserSlugsByPrefix('!', newMessage)
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

		this.props.sdk.event.create(message)
			.then(() => {
				this.props.analytics.track('element.create', {
					element: {
						type: message.type
					}
				})
			})
			.catch((error) => {
				this.props.addNotification('danger', error.message || error)
			})
	}

	bindScrollArea (ref) {
		this.scrollArea = ref
	}

	bindFileInput (ref) {
		this.fileInputElement = ref
	}

	render () {
		const {
			allowWhispers,
			tail,
			usersTyping,
			wide
		} = this.props
		const whisper = allowWhispers && this.state.messageSymbol ? false : this.state.whisper
		const {
			messagesOnly,
			pendingMessages,
			hideWhispers
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id')

		// Remove non-message and non-whisper cards and update cards that don't have
		// a "name" field. Update cards with a "name" field provide a human readable
		// reason for the change in the "name" field, so should typically be
		// displayed by default
		if (messagesOnly) {
			_.remove(sortedTail, (card) => {
				if (card.type === 'update' && Boolean(card.name)) {
					return false
				}
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

		const sendCommand = getSendCommand(this.props.user)

		return (
			<Column>
				<Flex my={2} mr={2} justifyContent="flex-end">
					<Button
						plain
						tooltip={{
							placement: 'left',
							text: 'Jump to first message'
						}}
						ml={2}
						onClick={this.handleJumpToTop}
						icon={<Icon name="chevron-circle-up"/>}
					/>

					<Button
						plain
						tooltip={{
							placement: 'left',
							text: `${hideWhispers ? 'Show' : 'Hide'} whispers`
						}}
						style={{
							opacity: hideWhispers ? 0.5 : 1
						}}
						ml={2}
						onClick={this.handleWhisperToggle}
						icon={<Icon name="user-secret"/>}
					/>

					<Button
						plain
						tooltip={{
							placement: 'left',
							text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`
						}}
						style={{
							opacity: messagesOnly ? 0.5 : 1
						}}
						className="timeline__checkbox--additional-info"
						ml={2}
						onClick={this.handleEventToggle}
						icon={<Icon name="stream"/>}
					/>
				</Flex>

				<EventsContainer
					pt={2}
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
				>
					{!sortedTail && (<Box p={3}>
						<Icon spin name="cog"/>
					</Box>)}

					{(Boolean(sortedTail) && sortedTail.length > 0) &&
					_.map(sortedTail.slice(0 - (PAGE_SIZE * this.state.page)), (card) => {
						if (hideWhispers && card.type === 'whisper') {
							return null
						}

						if (_.includes(this.state.uploadingFiles, card.slug)) {
							return (
								<Box p={3}>
									<Icon name="cog" spin /><em>{' '}Uploading file...</em>
								</Box>
							)
						}

						if (card.type === 'update') {
							return (
								<Box key={card.id}>
									<Update
										onCardVisible={this.handleCardVisible}
										card={card}
										user={this.props.user}
										getActor={this.props.getActor}
									/>
								</Box>
							)
						}

						return (
							<Box key={card.id}>
								<Event
									onCardVisible={this.handleCardVisible}
									card={card}
									user={this.props.user}
									getActor={this.props.getActor}
									addNotification={this.props.addNotification}
								/>
							</Box>
						)
					})}

					{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
						return (
							<Box key={item.slug}>
								<Event
									user={this.props.user}
									card={item}
									getActor={this.props.getActor}
									addNotification={this.props.addNotification}
								/>
							</Box>
						)
					})}
				</EventsContainer>

				{typingMessage && (
					<TypingNotice data-test="typing-notice">
						<Box bg="white" ml={3}>
							<em>{typingMessage}</em>
						</Box>
					</TypingNotice>
				)}

				<MessageInput
					wide={wide}
					style={{
						borderTop: '1px solid #eee'
					}}
					allowWhispers={allowWhispers}
					whisper={whisper}
					toggleWhisper={this.toggleWhisper}
					sendCommand={sendCommand}
					value={this.state.newMessage}
					onChange={this.handleNewMessageChange}
					onSubmit={this.handleNewMessageSubmit}
					onFileChange={this.handleFileChange}
				/>
			</Column>
		)
	}
}

export default withSetup(Timeline)
