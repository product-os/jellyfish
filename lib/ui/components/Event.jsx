/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import copy from 'copy-to-clipboard'
import {
	circularDeepEqual
} from 'fast-equals'
import {
	saveAs
} from 'file-saver'
import _ from 'lodash'
import Mark from 'mark.js'
import React from 'react'
import {
	Box,
	Button,
	Flex,
	Theme,
	Txt
}	from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import styled from 'styled-components'
import {
	sdk
} from '../core'
import AuthenticatedImage from '../components/AuthenticatedImage'
import {
	ContextMenu
} from '../components/ContextMenu'
import {
	tagStyle
} from '../components/Tag'
import helpers from '../services/helpers'
import {
	getActor
} from '../services/store-helpers'
import {
	ActionLink
} from '../shame/ActionLink'
import Gravatar from '../shame/Gravatar'
import Icon from '../shame/Icon'
import {
	IconButton
} from '../shame/IconButton'

const tagMatchRE = helpers.createPrefixRegExp('@|#|!')
const EventButton = styled.button `
	cursor: pointer;
	border: 0;
	background: none;
	display: block;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-left: 8px;
	padding-right: 8px;
	border-left-style: solid;
	border-left-width: 3px;
`

const FRONT_IMG_RE = /^\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]$/

const getTarget = (card) => {
	return _.get(card, [ 'links', 'is attached to', '0' ]) || card
}

const getMessage = (card) => {
	const message = _.get(card, [ 'data', 'payload', 'message' ], '')

	// Fun hack to extract attached images embedded in HTML from synced front messages
	if (message.includes('<div></div><img src="/api/1/companies/resin_io/attachments')) {
		const source = message.match(/".*"/)[0]
		return `![Attached image](https://app.frontapp.com${source.replace(/"/g, '')})`
	}

	// Fun hack to extract attached images from synced front messages embedded in
	// a different way
	if (message.match(FRONT_IMG_RE)) {
		return `![Attached image](https://app.frontapp.com${message.slice(1, -1)})`
	}

	return message
}

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

	.rendition-tag-hl {
		${tagStyle}
	}

	.rendition-tag-hl--self {
		background: #FFF1C2;
		border-color: #FFC19B;
	}
`

const MessageWrapper = styled(Box) `
	min-width: 0;
	box-shadow: rgba(0, 0, 0, 0.25) 0px 0px 3px;
	padding: 8px 12px;
	margin: 0 8px 16px 0;
	border-radius: 10px;
`

const ProxyWrapper = styled(Box) `
	min-width: 0;
	background: #f5fcff;
	border: 3px solid #d7f3ff;
	padding: 8px 12px;
	margin: 0 8px 16px 0;
	border-radius: 10px;
`

const WhisperWrapper = styled(Box) `
	min-width: 0;
	background: #eee;
	border-radius: 10px;
	padding: 8px 16px;
	margin-right: 80px;
	margin-bottom: 8px;
`

class Event extends React.Component {
	constructor (props) {
		super(props)

		this.openChannel = () => {
			const {
				card, openChannel
			} = this.props
			if (!openChannel) {
				return
			}
			const target = getTarget(card)
			openChannel(target.id, target)
		}

		this.setMessageElement = (element) => {
			if (element) {
				this.messageElement = element
			}
		}

		this.copyJSON = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(JSON.stringify(this.props.card, null, 2))
		}

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		const createCard = _.find(_.get(this.props.card, [ 'links', 'has attached element' ]), {
			type: 'create'
		})
		const actor = _.get(this.props.card, [ 'data', 'actor' ]) || _.get(createCard, [ 'data', 'actor' ])

		this.state = {
			actor: getActor(actor),
			showMenu: false
		}
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidMount () {
		this.processText()
	}

	downloadAttachment (attachment) {
		sdk.getFile(this.props.card.id, attachment.url.split('/').pop())
			.then((data) => {
				const blob = new Blob([ data ], {
					type: attachment.mime
				})

				saveAs(blob, attachment.name)
			})
	}

	processText () {
		if (!this.messageElement) {
			return
		}

		// Modify all links in the message to open in a new tab
		// TODO: Make this an option in the rendition <Markdown /> component.
		this.messageElement.querySelectorAll('a').forEach((node) => {
			node.setAttribute('target', '_blank')
		})
		const instance = new Mark(this.messageElement)

		instance.markRegExp(tagMatchRE, {
			element: 'span',
			className: 'rendition-tag-hl',
			ignoreGroups: 1
		})
	}

	getTimelineElement (card) {
		const targetCard = _.get(card, [ 'links', 'is attached to', '0' ], {})
		if (targetCard.type === 'user') {
			return (
				<Txt color={Theme.colors.text.light}>
					<strong>{targetCard.slug.replace('user-', '')}</strong> joined
				</Txt>
			)
		}
		let text = `${targetCard.name || targetCard.slug || targetCard.type || ''}`
		if (card.type === 'create') {
			text += ' created by'
		}
		if (card.type === 'update') {
			text += ' updated by'
		}
		return (<Txt color={Theme.colors.text.light}>
			<em>{text}</em> <strong>{this.state.actor.name}</strong>
		</Txt>)
	}

	render () {
		const {
			card
		} = this.props
		const props = _.omit(this.props, [ 'card', 'openChannel' ])
		const isMessage = card.type === 'message' || card.type === 'whisper'

		let InnerWrapper = MessageWrapper
		if (card.type === 'whisper') {
			InnerWrapper = WhisperWrapper
		}

		if (this.state.actor.proxy) {
			InnerWrapper = ProxyWrapper
		}

		const message = getMessage(card)

		const attachments = _.get(card, [ 'data', 'payload', 'attachments' ])

		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at

		return (
			<EventWrapper {...props} className={`event-card--${card.type}`}>
				<EventButton onClick={this.openChannel} style={{
					borderLeftColor: helpers.colorHash(getTarget(card).id)
				}}>
					<Gravatar.default small email={this.state.actor.email}/>
				</EventButton>
				<InnerWrapper flex="1">
					<Flex justify="space-between" mb={2}>
						<Flex mt={isMessage ? 0 : '5px'} align="center">
							{isMessage && (
								<Txt
									tooltip={this.state.actor.email}
								>
									<strong>{this.state.actor.name}</strong>
								</Txt>
							)}

							{!isMessage && this.getTimelineElement(card)}

							{Boolean(card.data) && Boolean(timestamp) && (
								<Txt color={Theme.colors.text.light} fontSize={1} ml="6px">
									{helpers.formatTimestamp(timestamp, true)}
								</Txt>
							)}
							{card.pending &&
								<Txt color={Theme.colors.text.light} fontSize={1} ml="6px">
									sending...
									<Icon
										style={{
											marginLeft: 6
										}}
										name="cog fa-spin"
									/>
								</Txt>
							}
						</Flex>

						<span>
							<IconButton
								className="event-card--actions"
								px={2}
								mr={card.type === 'whisper' ? -12 : -1}
								plaintext
								onClick={this.toggleMenu}>
								<Icon name="ellipsis-v"/>

							</IconButton>

							{this.state.showMenu && (
								<ContextMenu position="bottom" onClose={this.toggleMenu}>
									<React.Fragment>
										<ActionLink onClick={this.copyJSON} tooltip={{
											text: 'JSON copied!',
											trigger: 'click'
										}}>
													Copy as JSON
										</ActionLink>
									</React.Fragment>
								</ContextMenu>
							)}
						</span>
					</Flex>

					{Boolean(attachments) && _.map(attachments, (attachment) => {
						return (
							<Button
								key={attachment.url}
								onClick={() => {
									this.downloadAttachment(attachment)
								}}
							>
								<Icon name="file-download" />
								<Txt monospace ml={2}>{attachment.name}</Txt>
							</Button>
						)
					})}

					{isMessage && Boolean(message) && (
						<div ref={this.setMessageElement}>
							<Markdown
								style={{
									fontSize: 'inherit'
								}}
								data-test={card.pending ? '' : 'event-card__message'}
							>
								{message}
							</Markdown>
						</div>
					)}
					{isMessage && Boolean(card.data.payload.file) && (
						<AuthenticatedImage cardId={card.id} fileName={card.data.payload.file}/>
					)}

					{!isMessage && Boolean(card.name) && (
						<Txt>{card.name}</Txt>
					)}
				</InnerWrapper>
			</EventWrapper>
		)
	}
}

export default Event
