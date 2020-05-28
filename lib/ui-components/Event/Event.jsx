/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
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
import EventBody from './EventBody'

const MESSAGE_COLLAPSED_HEIGHT = 400

const tagMatchRE = helpers.createPrefixRegExp('@|#|!')
const EventButton = styled.button `
	cursor: pointer;
	border: 0;
	background: none;
	display: block;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8px;
	border-left-style: solid;
	border-left-width: 3px;
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
				fontSize: '18px',
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

		this.state = {
			messageHeight: null
		}

		this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async componentDidMount () {
		this.processText()
	}

	processText () {
		if (!this.messageElement) {
			return
		}

		// Modify all links in the message to open in a new tab
		// TODO: Make this an option in the rendition <Markdown /> component.
		Array.from(this.messageElement.querySelectorAll('a')).forEach((node) => {
			node.setAttribute('target', '_blank')
		})
		const instance = new Mark(this.messageElement)

		const readBy = this.props.card.data.readBy || []
		const userSlug = this.props.user.slug
		const username = userSlug.slice(5)

		instance.markRegExp(tagMatchRE, {
			element: 'span',
			className: 'rendition-tag--hl',
			ignoreGroups: 1,
			each (element) {
				const text = element.innerText
				if (text.charAt(0) === '#') {
					return
				}

				const trimmed = text.slice(1).toLowerCase()

				if (trimmed === username) {
					element.className += ' rendition-tag--personal'
				}
				if (!readBy.length) {
					return
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
			card,
			actor,
			sdk,
			firstInThread,
			menuOptions,
			threadIsMirrored,
			openChannel,
			actions
		} = this.props
		const props = _.omit(this.props, [
			'card',
			'menuOptions',
			'onCardVisible',
			'openChannel',
			'actions'
		])

		const typeBase = card.type.split('@')[0]
		const isMessage = typeBase === 'message' || typeBase === 'whisper'

		const messageOverflows = this.state.messageHeight >= MESSAGE_COLLAPSED_HEIGHT
		const threadColor = helpers.colorHash(getTargetId(card))

		return (
			<VisibilitySensor onChange={this.handleVisibilityChange}>
				<EventWrapper {...props} className={`event-card--${typeBase}`}>
					<EventButton
						onClick={this.openChannel}
						style={{
							borderLeftColor: threadColor
						}}
					>
						<Avatar
							small
							name={actor ? actor.name : null}
							url={actor ? actor.avatarUrl : null}
							userStatus={_.get(actor, [ 'card', 'data', 'status' ])}
						/>

						{openChannel && (
							<Box
								tooltip={{
									placement: 'bottom',
									text: `Open ${card.type.split('@')[0]}`
								}}
							>
								<MessageIcon
									threadColor={threadColor}
									firstInThread={firstInThread}
								/>
							</Box>
						)}
					</EventButton>
					<Box
						pt={2}
						flex="1"
						pb={messageOverflows ? 0 : 2}
						style={{
							minWidth: 0
						}}
					>
						<EventHeader
							actor={actor}
							card={card}
							threadIsMirrored={threadIsMirrored}
							menuOptions={menuOptions}
							isMessage={isMessage} />
						<EventBody
							card={card}
							sdk={sdk}
							actor={actor}
							isMessage={isMessage}
							messageOverflows={messageOverflows}
							addNoticication={actions.addNotification}
							setMessageElement={this.setMessageElement}
							messageCollapsedHeight={MESSAGE_COLLAPSED_HEIGHT}
						/>
					</Box>
				</EventWrapper>
			</VisibilitySensor>
		)
	}
}
