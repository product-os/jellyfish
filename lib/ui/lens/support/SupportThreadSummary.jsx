/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
import * as storeHelpers from '../../services/store-helpers'
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

export default function SupportThreadSummary (props) {
	const card = props.card
	const timeline = _.sortBy(card.links['has attached element'], 'data.timestamp')
	const messages = _.filter(timeline, (event) => {
		return event.type === 'message' || event.type === 'whisper'
	})
	const lastMessageOrWhisper = _.last(messages)
	const actor = getCreator(card)
	const lastActor = lastMessageOrWhisper
		? storeHelpers.getActor(_.get(lastMessageOrWhisper, [ 'data', 'actor' ]))
		: null
	return (
		<SupportThreadSummaryWrapper
			data-test-component="support-thread-summary"
			data-test-id={card.id}
			key={card.id}
			p={3}
			style={{
				borderLeftColor: helpers.colorHash(card.id)
			}}
			onClick={() => {
				return props.openChannel(card.id)
			}}
		>
			<Flex justify="space-between">
				<Flex mb={2}>
					<ColorHashPill value={_.get(card, [ 'data', 'inbox' ])} mr={2} />
					<ColorHashPill value={_.get(card, [ 'data', 'status' ])} mr={2} />
				</Flex>

				<Txt>Created {helpers.formatTimestamp(card.created_at)}</Txt>
			</Flex>
			<Flex justify="space-between">
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

					<Txt
						data-test-component="support-thread-summary__message"
						style={{
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							border: '1px solid #eee',
							borderRadius: 10,
							padding: '4px 16px',
							background: (lastMessageOrWhisper || {}).type === 'whisper' ? '#eee' : 'white',
							flex: 1
						}}
					>
						{
							_.get(lastMessageOrWhisper, [ 'data', 'payload', 'message' ], '')
								.split('\n')
								.shift()
						}
					</Txt>
				</Flex>
			)}
		</SupportThreadSummaryWrapper>
	)
}
