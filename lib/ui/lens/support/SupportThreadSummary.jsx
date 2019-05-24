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
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import * as helpers from '../../services/helpers'
import ColorHashPill from '../../shame/ColorHashPill'
import Gravatar from '../../shame/Gravatar'
import {
	getCreator,
	getLastUpdate
} from './utils'

const SupportThreadSummaryWrapper = styled(Box) `
	border-left-style: solid;
	border-left-width: 3px;
	border-bottom: 1px solid #eee;
	cursor: pointer;
	transition: background ease-in-out 150ms;

	&:hover {
		background: ${Theme.colors.gray.light};
	}
`

const SummaryMessage = styled(Txt) `
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border: 1px solid #eee;
	border-radius: 10px;
	padding: 4px 16px;
	color: #333;
	background: white;
	flex: 1;
`

const SummaryWhisper = styled(Txt) `
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border-radius: 10px;
	padding: 4px 16px;
	color: white;
	background: #333;
	flex: 1;
`

export default class SupportThreadSummary extends React.Component {
	constructor (props) {
		super(props)

		this.openChannel = this.openChannel.bind(this)

		this.state = {
			actor: null,
			lastActor: null
		}
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async componentDidMount () {
		const card = this.props.card
		const timeline = _.sortBy(_.get(card.links, [ 'has attached element' ], []), 'data.timestamp')
		const messages = _.filter(timeline, (event) => {
			return event.type === 'message' || event.type === 'whisper'
		})
		const lastMessageOrWhisper = _.last(messages)
		const actor = await getCreator(this.props.getActor, card)
		const lastActor = lastMessageOrWhisper
			? await this.props.getActor(_.get(lastMessageOrWhisper, [ 'data', 'actor' ]))
			: null

		this.setState({
			actor,
			lastActor
		})
	}

	openChannel () {
		this.props.openChannel(this.props.card.id)
	}

	render () {
		const {
			props
		} = this
		const {
			actor,
			lastActor
		} = this.state

		const card = props.card
		const timeline = _.sortBy(_.get(card.links, [ 'has attached element' ], []), 'data.timestamp')
		const messages = _.filter(timeline, (event) => {
			return event.type === 'message' || event.type === 'whisper'
		})
		const lastMessageOrWhisper = _.last(messages)

		const style = {
			borderLeftColor: helpers.colorHash(card.id)
		}

		if (props.active) {
			style.background = '#9f9f9f'
			style.color = 'white'
		}

		const Container = (lastMessageOrWhisper || {}).type === 'whisper'
			? SummaryWhisper
			: SummaryMessage

		return (
			<SupportThreadSummaryWrapper
				data-test-component="support-thread-summary"
				data-test-id={card.id}
				p={3}
				style={style}
				onClick={this.openChannel}
			>
				<Flex justifyContent="space-between">
					<Flex mb={2} alignItems="flex-start">
						<ColorHashPill value={_.get(card, [ 'data', 'inbox' ])} mr={2} />
						<ColorHashPill value={_.get(card, [ 'data', 'status' ])} mr={2} />
					</Flex>

					<Txt>Created {helpers.formatTimestamp(card.created_at)}</Txt>
				</Flex>
				<Flex justifyContent="space-between">
					<Box>
						{Boolean(card.name) && (
							<Txt bold>{card.name}</Txt>
						)}
						{!card.name && Boolean(actor) && (
							<Txt bold>{`Conversation with ${actor.name}`}</Txt>
						)}
					</Box>

					<Txt>
						Updated {helpers.timeAgo(_.get(getLastUpdate(card), [ 'data', 'timestamp' ]))}
					</Txt>
				</Flex>
				<Txt my={2}>{messages.length} message{messages.length !== 1 && 's'}</Txt>
				{lastMessageOrWhisper && (
					<Flex>
						<Gravatar.default small pr={2} email={lastActor ? lastActor.email : null}/>

						<Container
							data-test-component="support-thread-summary__message"
						>
							{
								_.get(lastMessageOrWhisper, [ 'data', 'payload', 'message' ], '')
									.split('\n')
									.shift()
							}
						</Container>
					</Flex>
				)}
			</SupportThreadSummaryWrapper>
		)
	}
}
