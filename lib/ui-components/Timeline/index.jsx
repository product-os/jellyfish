/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
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

const PAGE_SIZE = 20

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

class Timeline extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			reachedBeginningOfTimeline: false,
			hideWhispers: false,
			messageSymbol: false,
			messagesOnly: true,
			newMessage: this.props.timelineMessage,
			pendingMessages: [],
			showNewCardModal: false,
			whisper: Boolean(this.props.allowWhispers),
			uploadingFiles: [],
			eventSkip: PAGE_SIZE,
			events: []
		}

		this.scrollToBottom = this.scrollToBottom.bind(this)
		this.handleScrollBeginning = this.handleScrollBeginning.bind(this)
		this.bindMessageEnd = this.bindMessageEnd.bind(this)
		this.bindFileInput = this.bindFileInput.bind(this)
		this.handleCardVisible = this.handleCardVisible.bind(this)
		this.toggleWhisper = this.toggleWhisper.bind(this)
		this.handleFileChange = this.handleFileChange.bind(this)
		this.handleEventToggle = this.handleEventToggle.bind(this)
		this.handleNewMessageSubmit = this.handleNewMessageSubmit.bind(this)
		this.handleNewMessageChange = _.debounce(this.handleNewMessageChange.bind(this), 100)
		this.handleWhisperToggle = this.handleWhisperToggle.bind(this)

		this.signalTyping = _.throttle(() => {
			this.props.signalTyping(this.props.card.id)
		}, 1500)

		this.preserveMessage = _.debounce((newMessage) => {
			this.props.setTimelineMessage(this.props.card.id, newMessage)
		}, 1500)
	}

	componentDidMount () {
		const {
			tail
		} = this.props
		this.setState({
			events: tail
		}, () => {
			this.scrollToBottom()
		})
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidUpdate (prevProps, prevState) {
		this.setState({
			events: this.props.tail
		})
	}

	handleScrollBeginning () {
		const {
			sdk,
			card
		} = this.props
		const {
			events,
			eventSkip
		} = this.state
		return sdk.card.getWithTimeline(card.slug, {
			queryOptions: {
				links: {
					'has attached element': {
						sortBy: 'created_at',
						limit: PAGE_SIZE,
						skip: eventSkip,
						sortDir: 'desc'
					}
				}
			}
		}).then((results) => {
			const newEvents = _.get(results, [ 'links', 'has attached element' ])
			const validEvents = _.compact(newEvents)
			if (validEvents.length === 0) {
				this.setState({
					reachedBeginningOfTimeline: true
				})
			} else {
				this.setState({
					events: _.concat(events, validEvents),
					eventSkip: eventSkip + PAGE_SIZE
				})
			}
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

	handleCardVisible (card) {
		this.props.sdk.card.markAsRead(this.props.user.slug, card, _.map(_.filter(this.props.groups, 'isMine'), 'name'))
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
		}, () => {
			this.scrollToBottom()
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

	bindFileInput (ref) {
		this.fileInputElement = ref
	}

	bindMessageEnd (ref) {
		this.messageEnd = ref
	}

	scrollToBottom () {
		this.messageEnd.scrollIntoView({
			behavior: 'smooth'
		})
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
			events,
			reachedBeginningOfTimeline
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in events
		const sortedEvents = _.uniqBy(_.sortBy(events, 'data.timestamp'), 'id')

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

				<EventsContainer>
					{!sortedEvents && (<Box p={3}>
						<Icon spin name="cog"/>
					</Box>)}
					<InfiniteList
						fillMaxArea
						onScrollBeginning={!reachedBeginningOfTimeline && this.handleScrollBeginning}
					>
						<TimelineStart
							reachedBeginningOfTimeline={sortedEvents.length < PAGE_SIZE || reachedBeginningOfTimeline}
						/>
						<EventsList
							{ ...eventProps }
							getActor={getActor}
							hideWhispers={hideWhispers}
							sortedEvents={sortedEvents}
							uploadingFiles={this.state.uploadingFiles}
							handleCardVisible={this.handleCardVisible}
							messagesOnly={messagesOnly}
							user={user}
						/>
						<PendingMessages
							{ ...eventProps }
							pendingMessages={pendingMessages}
						/>
						<div ref={this.bindMessageEnd} />
					</InfiniteList>
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
