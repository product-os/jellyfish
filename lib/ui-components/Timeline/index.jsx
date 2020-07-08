/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import queryString from 'query-string'
import _ from 'lodash'
import React from 'react'
import {
	Box
} from 'rendition'
import {
	v4 as uuid
} from 'uuid'
import * as helpers from '../services/helpers'
import Column from '../shame/Column'
import Icon from '../shame/Icon'
import MessageInput from './MessageInput'
import {
	withSetup
} from '../SetupProvider'
import Header from './Header'
import EventsList from './EventsList'
import PendingMessages from './PendingMessages'
import TypingNotice from './TypingNotice'
import EventsContainer from '../EventsContainer'

const messageSymbolRE = /^\s*%\s*/

/*
 * This message text is used when uploading a file so that syncing can be done
 * effectively without have to sync the entire file
 */
export const HIDDEN_ANCHOR = '#jellyfish-hidden'
export const FILE_PROXY_MESSAGE = `[](${HIDDEN_ANCHOR})A file has been uploaded using Jellyfish:`

const getSendCommand = (user) => {
	return _.get(user.data, [ 'profile', 'sendCommand' ], 'shift+enter')
}

const PAGE_SIZE = 20

class Timeline extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true

		this.state = {
			scrollToEvent: null,
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
		const type = this.state.whisper ? 'whisper' : 'message'
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
		const {
			event
		} = queryString.parse(window.location.search)
		if (event) {
			this.setState({
				scrollToEvent: event
			})
		}
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
		if (this.state.scrollToEvent && _.find(this.props.tail, {
			id: this.state.scrollToEvent
		})) {
			const messageElement = document.getElementById(`event-${this.state.scrollToEvent}`)
			if (messageElement) {
				messageElement.scrollIntoView({
					behavior: 'smooth'
				})
				this.setState({
					scrollToEvent: null
				})
			}
		} else {
			// Scroll to bottom if the component has been updated with new items
			this.scrollToBottom()
		}
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
		this.props.sdk.card.markAsRead(this.props.user.slug, card, _.map(_.filter(this.props.groups, 'isMine'), 'name'))
			.catch((error) => {
				console.error(error)
			})
	}

	addMessage (event) {
		event.preventDefault()
		const newMessage = event.target.value || this.state.newMessage
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
			card,
			getActor,
			selectCard,
			getCard,
			enableAutocomplete,
			eventMenuOptions,
			addNotification,
			sdk,
			types,
			groups,
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
			hideWhispers,
			page
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id')

		const sendCommand = getSendCommand(user)

		const isMirrored = !_.isEmpty(_.get(card, [ 'data', 'mirrors' ]))

		const eventProps = {
			types,
			groups,
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

		return (
			<Column>
				<Header
					headerOptions={headerOptions}
					hideWhispers={hideWhispers}
					messagesOnly={messagesOnly}
					sortedTail={sortedTail}
					handleJumpToTop={this.handleJumpToTop}
					handleWhisperToggle={this.handleWhisperToggle}
					handleEventToggle={this.handleEventToggle}
					card={card}
					getActor={getActor}
				/>

				<EventsContainer
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
				>
					{!sortedTail && (<Box p={3}>
						<Icon spin name="cog"/>
					</Box>)}
					<EventsList
						{ ...eventProps }
						getActor={getActor}
						hideWhispers={hideWhispers}
						sortedTail={sortedTail}
						uploadingFiles={this.state.uploadingFiles}
						handleCardVisible={this.handleCardVisible}
						messagesOnly={messagesOnly}
						page={page}
						pageSize={PAGE_SIZE}
						user={user}
						eventMenuOptions={eventMenuOptions}
					/>
					<PendingMessages
						{ ...eventProps }
						pendingMessages={pendingMessages}
					/>
				</EventsContainer>

				<TypingNotice usersTyping={usersTyping} />

				<MessageInput
					enableAutocomplete={enableAutocomplete}
					sdk={sdk}
					types={types}
					user={user}
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
