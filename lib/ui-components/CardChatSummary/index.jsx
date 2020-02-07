/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import * as React from 'react'
import {
	Box,
	Flex,
	Txt
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import styled, {
	withTheme
} from 'styled-components'
import Link from '../Link'
import * as helpers from '../services/helpers'
import ColorHashPill from '../shame/ColorHashPill'
import Icon from '../shame/Icon'
import {
	Tag
} from '../Tag'

const SummaryWrapper = styled(Link) `
	display: block;
	padding: 18px 16px;
	border-left-style: solid;
	border-left-width: 4px;
	border-bottom: 1px solid #eee;
	cursor: pointer;
	color: ${(props) => { return props.theme.colors.text.main }};
	box-shadow: -5px 4.5px 10.5px 0 rgba(152, 173, 227, 0.08);

	${(props) => {
		return props.active ? `
			background: ${props.theme.colors.info.light};
			border-left-color: ${props.theme.colors.info.main};
		` : `
			background: white;
			border-left-color: transparent;
		`
	}}

	&:hover {
		color: ${(props) => { return props.theme.colors.text.main }};
		background: ${(props) => { return props.theme.colors.quartenary.light }};
	}
`

const LatestMessage = styled(Markdown) `
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border-radius: 6px;
	padding-left: 10px;
	flex: 1;

	> p {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`

export class CardChatSummary extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			actor: null
		}
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidMount () {
		this.setActors()
	}

	async setActors () {
		const card = this.props.card
		const actor = await helpers.getCreator(this.props.getActor, card)

		this.setState({
			actor
		})
	}

	render () {
		const {
			card,
			timeline,
			active,
			to,
			theme,
			...rest
		} = this.props

		const {
			actor
		} = this.state

		let latestMessageText = ''

		// Get latest message text
		for (let index = timeline.length - 1; index >= 0; index--) {
			const event = timeline[index]
			const typeBase = event.type.split('@')[0]
			if (typeBase === 'message' || typeBase === 'whisper') {
				latestMessageText = _.get(event, [ 'data', 'payload', 'message' ], '')
					.split('\n')
					.shift()
				break
			}
		}

		return (
			<SummaryWrapper
				data-test-component="card-chat-summary"
				data-test-id={card.id}
				active={active}
				to={to}
				{...rest}
			>
				<Flex justifyContent="space-between" mb={3}>
					<Flex alignItems="flex-start">
						<ColorHashPill value={_.get(card, [ 'data', 'inbox' ])} mr={2} />
						<ColorHashPill value={_.get(card, [ 'data', 'status' ])} mr={2} />
						{Boolean(card.tags) && _.map(card.tags, (tag) => {
							if (
								tag === 'status' ||
								tag === 'summary' ||
								tag.includes('pending')
							) {
								return null
							}
							return (
								<Tag
									key={tag}
									mr={2}
									style={{
										lineHeight: 1.5,
										fontSize: 10,
										letterSpacing: 0.5
									}}>
									{tag}
								</Tag>
							)
						})}
					</Flex>

					<Txt color="text.light" fontSize={12}>
						Updated {helpers.timeAgo(_.get(helpers.getLastUpdate(card), [ 'data', 'timestamp' ]))}
					</Txt>
				</Flex>

				<Flex justifyContent="space-between" mb={1}>
					<Box style={{
						flex: 1,
						minWidth: 0,
						marginRight: 10
					}}>
						<Txt
							bold
							style={{
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis'
							}}>
							{card.name || (actor && `Conversation with ${actor.name}`) || card.slug}
						</Txt>
					</Box>
				</Flex>

				{latestMessageText && (
					<Flex alignItems="center">
						<Icon
							name="reply"
							rotate={180}
							style={{
								color: active ? theme.colors.info.main : theme.colors.quartenary.dark
							}}
						/>

						<LatestMessage data-test="card-chat-summary__message">
							{latestMessageText}
						</LatestMessage>
					</Flex>
				)}
			</SummaryWrapper>
		)
	}
}

export default withTheme(CardChatSummary)
