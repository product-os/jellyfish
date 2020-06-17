/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Theme, Flex, Txt
} from 'rendition'
import Link from '../Link'
import EventContext from './EventContext'

const HeaderWrapper = styled(Flex) `
	position: relative;
`

const ActorPlaceholder = styled.span `
	width: 80px;
	line-height: inherit;
	background: #eee;
	display: inline-block;
	border-radius: 10px;
	text-align: center;
`

export default class EventHeader extends React.Component {
	constructor (props) {
		super(props)

		this.getTimelineElement = (card) => {
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
					<em>{text}</em> <strong>{this.props.actor ? this.props.actor.name : ''}</strong>
				</Txt>
			)
		}
	}

	render () {
		const {
			isMessage,
			actor,
			card,
			threadIsMirrored,
			menuOptions,
			user,
			updating,
			onEditMessage,
			squashTop,
			getActorHref
		} = this.props

		const isOwnMessage = user.id === _.get(card, [ 'data', 'actor' ])

		return (
			<HeaderWrapper justifyContent="space-between">
				<Flex
					mt={isMessage ? 0 : 1}
					alignItems="center"
					style={{
						lineHeight: 1.75
					}}
				>
					{(!squashTop && isMessage) && (
						<Txt
							data-test="event__actor-label"
							tooltip={actor ? actor.email : 'loading...'}
						>
							{Boolean(actor) && Boolean(actor.card) && (() => {
								const text = <Txt.span color="black">{actor.name}</Txt.span>

								if (getActorHref) {
									return (
										<Link to={getActorHref(actor)}>{text}</Link>
									)
								}

								return text
							})()}

							{Boolean(actor) && !actor.card && (
								<Txt.span>Unknown user</Txt.span>
							)}

							{!actor && <ActorPlaceholder>Loading...</ActorPlaceholder>}
						</Txt>
					)}

					{(!squashTop && !isMessage) && this.getTimelineElement(card)}
				</Flex>

				<EventContext
					card={card}
					menuOptions={menuOptions}
					onEditMessage={onEditMessage}
					isOwnMessage={isOwnMessage}
					isMessage={isMessage}
					updating={updating}
					threadIsMirrored={threadIsMirrored}
				/>
			</HeaderWrapper>
		)
	}
}
