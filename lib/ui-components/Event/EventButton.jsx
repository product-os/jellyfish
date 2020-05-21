/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Box
} from 'rendition'
import Avatar from '../shame/Avatar'
import Icon from '../shame/Icon'
import {
	colorHash
} from '../services/helpers'

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
	firstInThread, threadColor
}) => {
	const transform = firstInThread ? null : 'scale(1, -1)'
	return (
		<Icon
			style={{
				marginLeft: 6,
				marginTop: 16,
				fontSize: '18px',
				transform,
				color: threadColor
			}}
			name={firstInThread ? 'comment-alt' : 'share'}
		/>
	)
}

const OpenChannelTooltip = ({
	threadColor, firstInThread, card
}) => {
	return (
		<Box
			tooltip={{
				placement: 'bottom',
				text: `Open ${card.type.split('@')[0]}`
			}}
		>
			<MessageIcon threadColor={threadColor} firstInThread={firstInThread} />
		</Box>
	)
}

export default class EventButtonContainer extends React.Component {
	constructor (props) {
		super(props)

		this.handleOnClick = () => {
			const {
				card, openChannel
			} = this.props
			if (!openChannel) {
				return
			}
			const targetId = getTargetId(card)
			openChannel(targetId)
		}
	}
	render () {
		const {
			card, actor, openChannel
		} = this.props

		const threadColor = colorHash(getTargetId(card))
		return (
			<EventButton
				onClick={this.handleOnClick}
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
					<OpenChannelTooltip {...this.props} threadColor={threadColor} />
				)}
			</EventButton>
		)
	}
}
