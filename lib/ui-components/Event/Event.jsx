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
	Box, Flex, Theme, Txt
} from 'rendition'
import styled from 'styled-components'
import {
	tagStyle
} from '../Tag'
import * as helpers from '../services/helpers'
import EventButton from './EventButton'
import Header from './Header'
import Body from './Body'

const MESSAGE_COLLAPSED_HEIGHT = 400

const tagMatchRE = helpers.createPrefixRegExp('@|#|!')

// Min-width is used to stop text from overflowing the flex container, see
// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
const EventWrapper = styled(Flex) `
	min-width: 0;
	word-break: break-word;

	.event-card--actions {
		opacity: 0;
	}

	&:hover {
		.event-card--actions {
			opacity: 1;
		}
	}

	.rendition-tag--hl {
		position: relative;
		${tagStyle}
		background: none;
		color: inherit;
		border-color: inherit;
	}

	.rendition-tag--personal {
		background: #fff1c2;
		border-color: #ffc19b;
	}

	.rendition-tag--read:after {
		content: "✔";
		position: absolute;
		top: -4px;
		right: -4px;
		font-size: 10px;
	}
`

export default class Event extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			messageHeight: null
		}

		this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		)
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

		if (isMessage && isVisible && this.props.onCardVisible) {
			this.props.onCardVisible(this.props.card)
		}
	}

	getTimelineElement (card) {
		const targetCard = _.get(card, [ 'links', 'is attached to', '0' ], card)
		const typeBase = targetCard.type.split('@')[0]
		if (typeBase === 'user') {
			return (
				<Txt color={Theme.colors.text.light}>
					<strong>{targetCard.slug.replace('user-', '')}</strong> joined
				</Txt>
			)
		}
		let text = `${targetCard.name || targetCard.slug || targetCard.type || ''}`

		if (typeBase === 'update') {
			text += ' updated by'
		} else {
			text += ' created by'
		}

		return (
			<Txt color={Theme.colors.text.light}>
				<em>{text}</em>{' '}
				<strong>{this.props.actor ? this.props.actor.name : ''}</strong>
			</Txt>
		)
	}

	render () {
		const {
			card, actor, firstInThread, openChannel
		} = this.props
		const props = _.omit(this.props, [
			'card',
			'menuOptions',
			'onCardVisible',
			'openChannel',
			'addNotification'
		])

		const typeBase = card.type.split('@')[0]
		const isMessage = typeBase === 'message' || typeBase === 'whisper'

		const messageOverflows =
			this.state.messageHeight >= MESSAGE_COLLAPSED_HEIGHT
		return (
			<VisibilitySensor onChange={this.handleVisibilityChange}>
				<EventWrapper {...props} className={`event-card--${typeBase}`}>
					<EventButton
						card={card}
						actor={actor}
						firstInThread={firstInThread}
						openChannel={openChannel}
					/>
					<Box
						pt={2}
						flex="1"
						pb={messageOverflows ? 0 : 2}
						style={{
							minWidth: 0
						}}
					>
						<Header {...this.props} />
						<Body
							{...this.props}
							isMessage={isMessage}
							messageCollapsedHeight={MESSAGE_COLLAPSED_HEIGHT}
						/>
					</Box>
				</EventWrapper>
			</VisibilitySensor>
		)
	}
}
