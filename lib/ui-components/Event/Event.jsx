/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import classnames from 'classnames'
import _ from 'lodash'
import queryString from 'query-string'
import * as jsonpatch from 'fast-json-patch'
import Mark from 'mark.js'
import React from 'react'
import VisibilitySensor from 'react-visibility-sensor'
import {
	Box
}	from 'rendition'
import styled from 'styled-components'
import * as helpers from '../services/helpers'
import Avatar from '../shame/Avatar'
import Icon from '../shame/Icon'
import EventWrapper from './EventWrapper'
import EventHeader from './EventHeader'
import EventBody, {
	getMessage
} from './EventBody'

const MESSAGE_COLLAPSED_HEIGHT = 400

const prefixOptions = '@{1,2}|#|!{1,2}'
const prefixRE = new RegExp(`^(${prefixOptions})`)
const tagMatchRE = helpers.createPrefixRegExp(prefixOptions)

const EventButton = styled.button `
	cursor: ${(props) => { return props.openChannel ? 'pointer' : 'default' }};
	${(props) => {
		return props.openChannel ? '' : `
		  &:focus {
				outline:0;
			}
		`
	}}
	border: 0;
	background: transparent;
	display: block;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 4px 8px;
	border-left-style: solid;
	border-left-width: 3px;
	width: 43px;
`

const MessageIconWrapper = styled(Box) `
	transform: scale(0.8);
	transition: 150ms ease-in-out transform, 150ms ease-in-out filter;
	.event-card:hover & {
		filter: brightness(85%);
		transform: scale(1);
	}
`

const getTargetId = (card) => {
	return _.get(card, [ 'data', 'target' ]) || card.id
}

const MessageIcon = ({
	firstInThread,
	threadColor
}) => {
	return (
		<Icon
			style={{
				marginLeft: 6,
				marginTop: 16,
				fontSize: '21px',
				transform: 'scale(1, -1)',
				color: threadColor
			}}
			name={firstInThread ? 'comment-alt' : 'share'}
		/>
	)
}

export default class Event extends React.Component {
	constructor (props) {
		super(props)

		this.openChannel = () => {
			const {
				card, openChannel
			} = this.props
			if (!openChannel) {
				return
			}
			const targetId = getTargetId(card)
			openChannel(targetId)
		}

		this.setMessageElement = (element) => {
			if (element) {
				this.messageElement = element
				this.setState({
					messageHeight: element.clientHeight
				})
			}
		}

		this.onStartEditing = () => {
			this.setState({
				editedMessage: getMessage(this.props.card)
			})
		}

		this.onStopEditing = () => {
			this.setState({
				editedMessage: null,
				updating: false
			})
		}

		this.updateEditedMessage = (event) => {
			this.setState({
				editedMessage: event.target.value
			})
		}

		this.saveEditedMessage = () => {
			const {
				sdk,
				user,
				card,
				onUpdateCard
			} = this.props
			if (this.state.editedMessage === getMessage(card) || this.state.editedMessage.length === 0) {
				// No change or empty message - just finish editing now
				this.onStopEditing()
			} else {
				this.setState({
					updating: true
				}, async () => {
					const {
						mentionsUser,
						alertsUser,
						mentionsGroup,
						alertsGroup,
						tags
					} = helpers.getMessageMetaData(this.state.editedMessage)
					const patch = jsonpatch.compare(this.props.card, _.defaultsDeep({
						tags,
						data: {
							payload: {
								message: this.state.editedMessage,
								mentionsUser,
								alertsUser,
								mentionsGroup,
								alertsGroup
							}
						}
					}, this.props.card))
					onUpdateCard(this.props.card, patch)
						.then(async () => {
							this.onStopEditing()

							// If the edit happens to add a mention of the current user,
							// we need to mark this message as read!
							const updatedCard = await sdk.card.get(card.id)
							sdk.card.markAsRead(user.slug, updatedCard)
						})
						.catch(() => {
							this.setState({
								updating: false
							})
						})
				})
			}
		}

		this.state = {
			editedMessage: null,
			updating: false,
			messageHeight: null
		}

		this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
		this.processText = this.processText.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async componentDidMount () {
		this.processText()
	}

	componentDidUpdate (prevProps) {
		if (prevProps.card !== this.props.card) {
			this.processText()
		}
	}

	processText () {
		if (!this.messageElement) {
			return
		}

		const instance = new Mark(this.messageElement)
		instance.unmark()

		const readBy = this.props.card.data.readBy || []
		const userSlug = this.props.user.slug
		const username = userSlug.slice(5)
		const groups = this.props.groups || []

		instance.markRegExp(tagMatchRE, {
			element: 'span',
			className: 'rendition-tag--hl',
			ignoreGroups: 1,
			each (element) {
				const text = element.innerText || element.textContent
				if (text.charAt(0) === '#') {
					return
				}

				const trimmed = text.replace(prefixRE, '').toLowerCase()
				const group = groups[trimmed]

				if (group && group.isMine) {
					element.className += ' rendition-tag--personal'
				} else if (trimmed === username) {
					element.className += ' rendition-tag--personal'
				}

				if (!readBy.length) {
					return
				}

				if (group) {
					const readByCount = _.intersection(readBy, group.users).length
					element.setAttribute('data-read-by-count', readByCount)
					element.className += ' rendition-tag--read-by'
				}

				if (_.includes(readBy, `user-${trimmed}`)) {
					element.className += ' rendition-tag--read'
				}
			}
		})
	}

	handleVisibilityChange (isVisible) {
		const {
			card
		} = this.props

		const typeBase = card.type.split('@')[0]
		const isMessage = typeBase === 'message' || typeBase === 'whisper'

		if (
			isMessage &&
			isVisible &&
			this.props.onCardVisible
		) {
			this.props.onCardVisible(this.props.card)
		}
	}

	render () {
		const {
			types,
			enableAutocomplete,
			sendCommand,
			user,
			card,
			actor,
			sdk,
			firstInThread,
			menuOptions,
			threadIsMirrored,
			openChannel,
			onCardVisible,
			onUpdateCard,
			actions,
			previousEvent,
			nextEvent,
			getActorHref,
			...rest
		} = this.props

		const {
			editedMessage,
			updating
		} = this.state

		const typeBase = card.type.split('@')[0]
		const isMessage = typeBase === 'message' || typeBase === 'whisper'

		const messageOverflows = this.state.messageHeight >= MESSAGE_COLLAPSED_HEIGHT
		const threadColor = helpers.colorHash(getTargetId(card))

		// Squash the top of the message if the previous event has the same target
		// and actor
		const squashTop = previousEvent &&
			previousEvent.type === card.type &&
			previousEvent.data.target === card.data.target &&
			previousEvent.data.actor === card.data.actor

		// Squash the bottom of the message if the next event has the same target
		// and actor
		const squashBottom = nextEvent &&
			nextEvent.type === card.type &&
			nextEvent.data.target === card.data.target &&
			nextEvent.data.actor === card.data.actor

		const {
			event: focusedEvent
		} = queryString.parse(_.get(location, [ 'search' ], ''))

		return (
			<VisibilitySensor onChange={this.handleVisibilityChange}>
				<EventWrapper
					{...rest}
					squashTop={squashTop}
					className={classnames(`event-card event-card--${typeBase}`, {
						'event--focused': focusedEvent && (focusedEvent === card.id)
					})}
					id={`event-${card.id}`}
				>
					<EventButton
						openChannel={openChannel}
						onClick={this.openChannel}
						style={{
							borderLeftColor: threadColor
						}}
					>
						{!squashTop && (
							<React.Fragment>
								<Avatar
									small
									name={actor ? actor.name : null}
									url={actor ? actor.avatarUrl : null}
									userStatus={_.get(actor, [ 'card', 'data', 'status' ])}
								/>

								{openChannel && (
									<MessageIconWrapper
										tooltip={{
											placement: 'bottom',
											text: `Open ${card.type.split('@')[0]}`
										}}
									>
										<MessageIcon
											threadColor={threadColor}
											firstInThread={firstInThread}
										/>
									</MessageIconWrapper>
								)}
							</React.Fragment>
						)}
					</EventButton>
					<Box
						pt={squashTop ? 0 : 1}
						pb={squashBottom ? 0 : 1}
						flex="1"
						style={{
							minWidth: 0
						}}
					>
						<EventHeader
							actor={actor}
							card={card}
							threadIsMirrored={threadIsMirrored}
							menuOptions={menuOptions}
							isMessage={isMessage}
							onEditMessage={this.onStartEditing}
							onCommitEdit={this.saveEditedMessage}
							onCancelEdit={this.onStopEditing}
							updating={updating}
							editing={editedMessage !== null}
							user={user}
							squashTop={squashTop}
							getActorHref={getActorHref}
						/>
						<EventBody
							squashTop={squashTop}
							squashBottom={squashBottom}
							card={card}
							sdk={sdk}
							actor={actor}
							isMessage={isMessage}
							messageOverflows={messageOverflows}
							addNoticication={actions.addNotification}
							setMessageElement={this.setMessageElement}
							messageCollapsedHeight={MESSAGE_COLLAPSED_HEIGHT}
							enableAutocomplete={enableAutocomplete}
							sendCommand={sendCommand}
							types={types}
							user={user}
							editedMessage={editedMessage}
							updating={updating}
							onUpdateDraft={this.updateEditedMessage}
							onSaveEditedMessage={this.saveEditedMessage}
						/>
					</Box>
				</EventWrapper>
			</VisibilitySensor>
		)
	}
}
