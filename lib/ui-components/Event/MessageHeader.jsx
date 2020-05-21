/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Txt
} from 'rendition'
import styled from 'styled-components'
import Link from '../Link'

const ActorPlaceholder = styled.span `
	width: 80px;
	line-height: inherit;
	background: #eee;
	display: inline-block;
	border-radius: 10px;
	text-align: center;
`

const MessageActor = ({
	actor
}) => {
	if (Boolean(actor) && Boolean(actor.card)) {
		return (
			<Link color="black" append={actor.card.slug}>
				<Txt.span>{actor.name}</Txt.span>
			</Link>
		)
	}

	if (Boolean(actor) && !actor.card) {
		return <Txt.span>Unknown user</Txt.span>
	}

	return <ActorPlaceholder>Loading...</ActorPlaceholder>
}

export default class MessageHeader extends React.Component {
	render () {
		const {
			actor
		} = this.props

		return (
			<Txt
				data-test="event__actor-label"
				tooltip={actor ? actor.email : 'loading...'}
			>
				<MessageActor actor={actor} />
			</Txt>
		)
	}
}
