/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	commaListsAnd,
	html
} from 'common-tags'
import {
	circularDeepEqual
} from 'fast-equals'
import {
	saveAs
} from 'file-saver'
import _ from 'lodash'
import moment from 'moment'
import React from 'react'
import {
	Box,
	Button,
	Flex,
	Txt
} from 'rendition'
import styled from 'styled-components'
import {
	v4 as uuid
} from 'uuid'
import Event, {
	getMessage
} from '../Event'
import Update, {
	generateJSONPatchDescription
} from '../Update'
import * as helpers from '../services/helpers'
import Column from '../shame/Column'
import Icon from '../shame/Icon'
import MessageInput from './MessageInput'
import {
	withSetup
} from '../SetupProvider'
import EventsContainer from '../EventsContainer'

const messageSymbolRE = /^\s*%\s*/

/*
 * This message text is used when uploading a file so that syncing can be done
 * effectively without have to sync the entire file
 */
export const HIDDEN_ANCHOR = '#jellyfish-hidden'
export const FILE_PROXY_MESSAGE = `[](${HIDDEN_ANCHOR})A file has been uploaded using Jellyfish:`

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

	async handleDownloadConversation (events) {
		let text = this.props.card.name
		let activeDate = null

		for (const event of events) {
			const typeBase = event.type.split('@')[0]
			let content = ''

			if (typeBase === 'update') {
				if (_.some(event.data.payload, 'op')) {
					content = generateJSONPatchDescription(event.data.payload)
				} else {
					content = event.name
				}
			} else if (typeBase === 'message' || typeBase === 'whisper') {
				content = (typeBase === 'whisper' ? '**whisper** ' : '') + getMessage(event)
			} else {
				continue
			}

			const actorCard = await this.props.getActor(event.data.actor)
			const actorName = actorCard.name || ''

			const timestamp = moment(_.get(event, [ 'data', 'timestamp' ]) || event.created_at)
			const time = timestamp.format('HH:mm')
			let date = ''

			// Show message date if it's different from previous message date
			if (!activeDate || !timestamp.isSame(activeDate, 'day')) {
				date = timestamp.format('YYYY - MM - DD')
				activeDate = timestamp
			}

			text += '\n\n'
			text += html `
                ${date}
                ${time} ${actorName}

                    ${content}
			`
		}

		const blob = new Blob([ text ], {
			type: 'text/plain'
		})

		saveAs(blob, `${this.props.card.name}.txt`)
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
		const {
			mentionsUser,
			alertsUser,
			mentionsGroup,
			alertsGroup,
			tags
		} = helpers.getMessageMetaData(newMessage)
		const whisper = allowWhispers && this.state.messageSymbol ? false : this.state.whisper
		const message = {
			target: this.props.card,
			type: whisper ? 'whisper' : 'message',
			slug: `${whisper ? 'whisper' : 'message'}-${uuid()}`,
			tags,
			payload: {
				mentionsUser,
				alertsUser,
				mentionsGroup,
				alertsGroup,
				message: helpers.replaceEmoji(newMessage.replace(messageSymbolRE, ''))
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
			user,
			selectCard,
			getCard,
			enableAutocomplete,
			eventMenuOptions,
			addNotification,
			sdk,
			types,
			allowWhispers,
			tail,
			usersTyping,
			wide,
			headerOptions,
			getActorHref
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
				const typeBase = card.type.split('@')[0]
				if (typeBase === 'update' && Boolean(card.name)) {
					return false
				}
				return typeBase !== 'message' && typeBase !== 'whisper'
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

		const isMirrored = !_.isEmpty(_.get(this.props.card, [ 'data', 'mirrors' ]))

		const headerTitle = _.get(headerOptions, [ 'title' ])

		const eventProps = {
			types,
			enableAutocomplete,
			sendCommand,
			onCardVisible: this.handleCardVisible,
			user,
			selectCard,
			getCard,
			actions: {
				addNotification
			},
			threadIsMirrored: isMirrored,
			menuOptions: eventMenuOptions,
			getActorHref
		}

		const pagedTail = (Boolean(sortedTail) && sortedTail.length > 0)
			? sortedTail.slice(0 - (PAGE_SIZE * this.state.page)) : null

		return (
			<Column>
				<Flex m={2}>
					{headerTitle && (
						<Box flex={1} mr={2} style={{
							minWidth: 0,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						}}>
							<Txt.span tooltip={headerTitle}>{headerTitle}</Txt.span>
						</Box>
					)}
					<Box style={{
						marginLeft: 'auto'
					}}>
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

						{_.get(headerOptions, [ 'buttons', 'toggleWhispers' ]) !== false && (
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
						)}

						{_.get(headerOptions, [ 'buttons', 'toggleEvents' ]) !== false && (
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
						)}

						<Button
							plain
							tooltip={{
								placement: 'left',
								text: 'Download conversation'
							}}
							ml={2}
							onClick={() => { return this.handleDownloadConversation(sortedTail) }}
							icon={<Icon name="download"/>}
						/>
					</Box>
				</Flex>

				<EventsContainer
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
				>
					{!sortedTail && (<Box p={3}>
						<Icon spin name="cog"/>
					</Box>)}

					{pagedTail && _.map(pagedTail, (card, index) => {
						if (hideWhispers && (card.type === 'whisper' || card.type === 'whisper@1.0.0')) {
							return null
						}

						if (_.includes(this.state.uploadingFiles, card.slug)) {
							return (
								<Box key={card.slug} p={3}>
									<Icon name="cog" spin /><em>{' '}Uploading file...</em>
								</Box>
							)
						}

						if (card.type === 'update' || card.type === 'update@1.0.0') {
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
									{...eventProps}
									previousEvent={pagedTail[index - 1]}
									nextEvent={pagedTail[index + 1]}
									card={card}
									user={this.props.user}
								/>
							</Box>
						)
					})}

					{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
						return (
							<Box key={item.slug}>
								<Event
									{...eventProps}
									card={item}
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
					enableAutocomplete={enableAutocomplete}
					sdk={sdk}
					types={types}
					user={this.props.user}
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
