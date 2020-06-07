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
	defaultSanitizerOptions,
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
	TagList
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

const sanitizerOptions = _.defaultsDeep({
	allowedAttributes: {
		// eslint-disable-next-line id-length
		a: _.get(defaultSanitizerOptions, [ 'allowedAttributes', 'a' ], []).concat('onclick')
	},

	transformTags: {
		img: (tagName, attribs) => {
			return {
				tagName: 'span',
				text: `[${attribs.title || attribs.alt || 'image'}]`
			}
		},
		// eslint-disable-next-line id-length
		a: (tagName, attribs) => {
			return {
				tagName: 'a',
				attribs: {
					...attribs,

					// The whole chat summary is clickable. Prevent navigating to the
					// chat/thread channel when clicking on a link within the last message
					// summary.
					// TODO: Improve this logic to use window.location instead of
					// window.open if the url is within the same app
					onclick: `event.stopPropagation(); window.open("${attribs.href}");`
				}
			}
		}
	}
}, defaultSanitizerOptions)

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
			highlightedFields,
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
					.replace(/```[^`]*```/, '`<code block>`')
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
					<Flex alignItems="flex-start" flexWrap="wrap">
						{_.map(highlightedFields, (keypath) => {
							return <ColorHashPill key={keypath} value={_.get(card, keypath)} mr={2} mb={1} />
						})}

						<TagList
							tags={card.tags.filter((tag) => { return !tag.includes('pending') })}
							blacklist={[ 'status', 'summary' ]}
							tagProps={{
								style: {
									lineHeight: 1.5,
									fontSize: 10,
									letterSpacing: 0.5
								}
							}}
						/>
					</Flex>

					{_.get(card.links, [ 'has attached element' ], []).length > 0 && (
						<Txt color="text.light" fontSize={12}>
							Updated {helpers.timeAgo(_.get(helpers.getLastUpdate(card), [ 'data', 'timestamp' ]))}
						</Txt>
					)}
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

						<LatestMessage data-test="card-chat-summary__message" sanitizerOptions={sanitizerOptions}>
							{latestMessageText}
						</LatestMessage>
					</Flex>
				)}
			</SummaryWrapper>
		)
	}
}

export default withTheme(CardChatSummary)
