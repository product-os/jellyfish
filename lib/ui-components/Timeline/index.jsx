/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import * as Bluebird from 'bluebird'
import _ from 'lodash'
import React from 'react'
import queryString from 'query-string'
import {
	Box
} from 'rendition'
import {
	v4 as uuid
} from 'uuid'
import * as helpers from '../services/helpers'
import Column from '../shame/Column'
import MessageInput from './MessageInput'
import {
	withSetup
} from '../SetupProvider'
import Header from './Header'
import Loading from './Loading'
import TimelineStart from './TimelineStart'
import EventsList from './EventsList'
import PendingMessages from './PendingMessages'
import TypingNotice from './TypingNotice'
import {
	UPDATE,
	CREATE
} from './constants'
import EventsContainer from '../EventsContainer'
import {
	InfiniteList
} from '../InfiniteList'

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

const getWithTimeline = async (sdk, card, queryOptions) => {
	const results = await sdk.card.getWithTimeline(card.slug, {
		queryOptions
	})
	const newEvents = _.get(results, [ 'links', 'has attached element' ])
	return _.compact(newEvents)
}

const getFreshPendingMessages = (tail, pendingMessages) => {
	return _.filter(pendingMessages, (pending) => {
		return !_.find(tail, [ 'slug', pending.slug ])
	})
}

class Timeline extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			hideWhispers: false,
			messageSymbol: false,
			messagesOnly: true,
			newMessage: this.props.timelineMessage,
			pendingMessages: [],
			showNewCardModal: false,
			whisper: Boolean(this.props.allowWhispers),
			uploadingFiles: [],
			eventSkip: PAGE_SIZE,
			events: this.props.tail,
			reachedBeginningOfTimeline: this.props.tail < PAGE_SIZE,
			loadingMoreEvents: false,
			ready: false
		}

		this.timelineStart = React.createRef()
		this.timelineEnd = React.createRef()
		this.scrollToTop = this.scrollToTop.bind(this)
		this.scrollToBottom = this.scrollToBottom.bind(this)
		this.scrollToEvent = this.scrollToEvent.bind(this)
		this.handleScrollBeginning = this.handleScrollBeginning.bind(this)
		this.retrieveFullTimelime = this.retrieveFullTimeline.bind(this)
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
	}

	async componentDidMount () {
		const {
			event
		} = queryString.parse(window.location.search)
		if (event) {
			this.scrollToEvent(event)
		} else {
			// Timeout required to ensure the timeline has loaded before we scroll to the bottom
			await Bluebird.delay(2000)
			this.scrollToBottom()
			await Bluebird.delay(500)
			this.setState({
				ready: true
			})
		}
	}

	componentDidUpdate (prevProps) {
		const {
			pendingMessages
		} = this.state
		const {
			tail
		} = this.props
		const updatedEvents = !circularDeepEqual(prevProps.tail, tail)
		const newMessages = tail.length > prevProps.tail.length
		if (updatedEvents) {
			this.setState({
				events: tail,
				pendingMessages: newMessages ? getFreshPendingMessages(tail, pendingMessages) : pendingMessages
			})
		}
	}

	scrollToEvent (eventId) {
		const {
			reachedBeginningOfTimeline,
			events
		} = this.state
		const existing = _.find(events, {
			id: eventId
		})
		if (existing) {
			const pureType = existing.type.split('@')[0]
			if (pureType === UPDATE || pureType === CREATE) {
				this.handleEventToggle()
			}
			const messageElement = document.getElementById(`event-${eventId}`)
			if (messageElement) {
				messageElement.scrollIntoView({
					behavior: 'smooth'
				})
			}
		} else if (!reachedBeginningOfTimeline) {
			this.retrieveFullTimeline(() => {
				this.scrollToEvent(eventId)
			})
		}
	}

	handleScrollBeginning () {
		return new Promise((resolve, reject) => {
			const {
				sdk,
				card
			} = this.props
			const {
				events,
				eventSkip
			} = this.state
			this.setState({
				loadingMoreEvents: true
			}, () => {
				return getWithTimeline(sdk, card, {
					links: {
						'has attached element': {
							sortBy: 'created_at',
							limit: PAGE_SIZE,
							skip: eventSkip,
							sortDir: 'desc'
						}
					}
				}).then((newEvents) => {
					const receivedNewEvents = newEvents.length > 0
					this.setState({
						events: _.concat(events, newEvents),
						eventSkip: receivedNewEvents ? eventSkip + PAGE_SIZE : eventSkip,
						loadingMoreEvents: false,
						reachedBeginningOfTimeline: !receivedNewEvents
					})
					resolve()
				}
				)
			})
		})
	}

	handleJumpToTop () {
		if (this.state.reachedBeginningOfTimeline) {
			this.scrollToTop()
		} else {
			this.retrieveFullTimeline(() => {
				this.scrollToTop()
			})
		}
	}

	retrieveFullTimeline (callback) {
		const {
			sdk,
			card
		} = this.props
		return getWithTimeline(sdk, card, {
			links: {
				'has attached element': {
					sortBy: 'created_at',
					sortDir: 'desc'
				}
			}
		}).then((newEvents) => {
			this.setState({
				reachedBeginningOfTimeline: true,
				events: _.concat(this.state.events, newEvents)
			}, callback)
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

	scrollToTop () {
		this.timelineStart.current.scrollIntoView({
			behaviour: 'smooth'
		})
	}

	scrollToBottom () {
		this.timelineEnd.current.scrollIntoView({
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
			events,
			messagesOnly,
			pendingMessages,
			hideWhispers,
			loadingMoreEvents,
			reachedBeginningOfTimeline,
			ready,
			uploadingFiles
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
					sortedEvents={sortedEvents}
					handleJumpToTop={this.handleJumpToTop}
					handleWhisperToggle={this.handleWhisperToggle}
					handleEventToggle={this.handleEventToggle}
					card={card}
					getActor={getActor}
				/>

				<EventsContainer>
					{!sortedEvents && (<Box p={3}>
						<Loading />
					</Box>)}
					<InfiniteList
						fillMaxArea
						onScrollBeginning={!reachedBeginningOfTimeline && ready && this.handleScrollBeginning}
						processing={loadingMoreEvents}
					>
						<div ref={this.timelineStart} />
						{ reachedBeginningOfTimeline && <TimelineStart />}
						{ loadingMoreEvents && <Loading />}
						<EventsList
							{ ...eventProps }
							user={user}
							getActor={getActor}
							hideWhispers={hideWhispers}
							sortedEvents={sortedEvents}
							uploadingFiles={uploadingFiles}
							messagesOnly={messagesOnly}
						/>
						<PendingMessages
							{ ...eventProps }
							pendingMessages={pendingMessages}
							sortedEvents={sortedEvents}
						/>
						<div ref={this.timelineEnd} />
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
