/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import copy from 'copy-to-clipboard'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Theme, Flex, Txt, Button
} from 'rendition'
import {
	ActionLink
} from '../shame/ActionLink'
import {
	formatTimestamp
} from '../services/helpers'
import Icon from '../shame/Icon'
import Link from '../Link'
import ContextMenu from '../ContextMenu'
import {
	MirrorIcon
} from '../MirrorIcon'

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

		this.state = {
			showMenu: false
		}

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		this.copyJSON = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(JSON.stringify(this.props.card, null, 2))
		}

		this.copyRawMessage = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(this.props.card.data.payload.message)
		}

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
			squashTop
		} = this.props
		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at

		const isOwnMessage = user.id === _.get(card, [ 'data', 'actor' ])

		return (
			<Flex justifyContent="space-between" mb={1} mt={squashTop ? 1 : 0}>
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
							{Boolean(actor) && Boolean(actor.card) && (
								<Link color="black" append={actor.card.slug}>
									<Txt.span>{actor.name}</Txt.span>
								</Link>
							)}

							{Boolean(actor) && !actor.card && (
								<Txt.span>Unknown user</Txt.span>
							)}

							{!actor && <ActorPlaceholder>Loading...</ActorPlaceholder>}
						</Txt>
					)}

					{(!squashTop && !isMessage) && this.getTimelineElement(card)}

					{Boolean(card.data) && Boolean(timestamp) && (
						<Txt
							className="event-card--timestamp"
							color={Theme.colors.text.light}
							fontSize={1}
							ml="6px"
						>
							{formatTimestamp(timestamp, true)}
						</Txt>
					)}
					{card.pending || updating ? (
						<Txt color={Theme.colors.text.light} fontSize={1} ml="6px" data-test="event-header__status">
							{ updating ? 'updating...' : 'sending...' }
							<Icon
								style={{
									marginLeft: 6
								}}
								spin
								name="cog"
							/>
						</Txt>
					) : (
						<MirrorIcon
							mirrors={_.get(card, [ 'data', 'mirrors' ])}
							threadIsMirrored={threadIsMirrored}
						/>
					)}
				</Flex>

				{menuOptions !== false && (
					<span>
						<Button
							className="event-card--actions"
							data-test="event-header__context-menu-trigger"
							px={2}
							plain
							onClick={this.toggleMenu}
							icon={<Icon name="ellipsis-v" />}
						/>

						{this.state.showMenu && (
							<ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									{isOwnMessage && !card.pending && !updating && (
										<ActionLink
											data-test="event-header__link--edit-message"
											onClick={onEditMessage}>
											Edit message
										</ActionLink>
									)}

									<ActionLink
										data-test="event-header__link--copy-json"
										onClick={this.copyJSON}
										tooltip={{
											text: 'JSON copied!',
											trigger: 'click'
										}}
									>
										Copy as JSON
									</ActionLink>

									{isMessage && (
										<ActionLink
											data-test="event-header__link--copy-raw"
											onClick={this.copyRawMessage}
											tooltip={{
												text: 'Message copied!',
												trigger: 'click'
											}}
										>
											Copy raw message
										</ActionLink>
									)}

									{menuOptions}
								</React.Fragment>
							</ContextMenu>
						)}
					</span>
				)}
			</Flex>
		)
	}
}
