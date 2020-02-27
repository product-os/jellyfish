/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import copy from 'copy-to-clipboard'
import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import Mark from 'mark.js'
import React from 'react'
import VisibilitySensor from 'react-visibility-sensor'
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
	saveAs
} from 'file-saver'
import AuthenticatedImage from '../AuthenticatedImage'
import ContextMenu from '../ContextMenu'
import {
	tagStyle
} from '../Tag'
import Link from '../Link'
import * as helpers from '../services/helpers'
import {
	ActionLink
} from '../shame/ActionLink'
import Avatar from '../shame/Avatar'
import Icon from '../shame/Icon'
import {
	HIDDEN_ANCHOR
} from '../Timeline'

const ActorPlaceholder = styled.span `
	width: 80px;
	line-height: inherit;
	background: #eee;
	display: inline-block;
	border-radius: 10px;
	text-align: center;
`

const MESSAGE_COLLAPSED_HEIGHT = 400

const getAttachments = (card) => {
	// Start by mapping sync attachments
	const attachments = _.get(card, [ 'data', 'payload', 'attachments' ], []).map((attachment) => {
		return {
			slug: attachment.url.split('/').pop(),
			mime: attachment.mime,
			name: attachment.name
		}
	})

	// Attach files directly uploaded in Jellyfish
	if (_.get(card, [ 'data', 'payload', 'file' ])) {
		attachments.push(card.data.payload.file)
	}

	return attachments
}

const tagMatchRE = helpers.createPrefixRegExp('@|#|!')
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

const FRONT_IMG_RE = /^\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]$/

const getTargetId = (card) => {
	return _.get(card, [ 'data', 'target' ]) || card.id
}

export const getMessage = (card) => {
	const message = _.get(card, [ 'data', 'payload', 'message' ], '')

	// Fun hack to extract attached images embedded in HTML from synced front messages
	if (message.includes('<img src="/api/1/companies/resin_io/attachments')) {
		const match = message.match(/\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+/)
		let formatted = message
		match.forEach((source) => {
			const index = formatted.indexOf(match)
			formatted = `${formatted.slice(0, index)}https://app.frontapp.com${formatted.slice(index)}`
		})

		return formatted
	}

	// Fun hack to extract attached images from synced front messages embedded in
	// a different way
	if (message.match(FRONT_IMG_RE)) {
		return `![Attached image](https://app.frontapp.com${message.slice(1, -1)})`
	}

	return message
		.split('\n')
		.filter((line) => { return !line.includes(HIDDEN_ANCHOR) })
		.join('\n')
}

const downloadFile = async (sdk, cardId, file) => {
	const {
		slug,
		name,
		mime
	} = file

	const data = await sdk.getFile(cardId, slug)
	const blob = new Blob([ data ], {
		type: mime
	})

	saveAs(blob, name)
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

	.rendition-tag--hl {
		position: relative;
		${tagStyle}
		background: none;
		color: inherit;
		border-color: inherit;
	}

	.rendition-tag--personal {
		background: #FFF1C2;
		border-color: #FFC19B;
	}

	.rendition-tag--read:after {
		content: '✔';
		position: absolute;
    top: -4px;
    right: -4px;
    font-size: 10px;
	}

	/*
	 * Emojis created in the balena forums get embedded in the message as images,
	 * we need to add an override style so that the message renders nicely
	 */
	img[src^="https://sjc1.discourse-cdn.com/business5/images/emoji/"],
	img[src^="https://forums.balena.io/images/emoji"] {
    width: 20px;
    height: 20px;
    vertical-align: middle;
	}
`

const MessageContainer = styled(Box) `
	border-radius: 6px;
	border-top-left-radius: 0;
	box-shadow: -5px 4.5px 10.5px 0 rgba(152, 173, 227, 0.08);

	a {
		color: inherit;
		text-decoration: underline;
	}

	a .rendition-tag--personal,
	.rendition-tag--personal {
		background: #FFF1C2;
		color: #333;

		&.rendition-tag--read:after {
			background: #FFC19B;
			border-radius: 5px;
			font-size: 8px;
			padding: 2px;
		}
	}

	code {
		color: #333;
		background-color: #f6f8fa;
	}

	${/* eslint-disable no-nested-ternary */
	(props) => {
		return props.whisper ? `
				background: ${props.theme.colors.secondary.main};
				color: white;

				blockquote {
					color: lightgray;
				}
			` : props.proxy ? `
				background: ${props.theme.colors.quartenary.main};
			` : `
				border: solid 0.5px #e8ebf2;
				background: white;
			`
	}
	/* eslint-enable no-nested-ternary */}
`

export default class Event extends React.Component {
	constructor (props) {
		super(props)

		this.openChannel = () => {
			const {
				card, openChannel
			} = this.props
			if (!openChannel) {
				return
			}
			const targetId = getTargetId(card)
			openChannel(targetId)
		}

		this.setMessageElement = (element) => {
			if (element) {
				this.messageElement = element
				this.setState({
					messageHeight: element.clientHeight
				})
			}
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

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		this.expand = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}

		this.state = {
			showMenu: false,
			expanded: false,
			messageHeight: null
		}

		this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
		this.downloadAttachment = this.downloadAttachment.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async componentDidMount () {
		this.processText()
	}

	downloadAttachment (event) {
		const attachments = getAttachments(this.props.card)
		const attachmentSlug = event.currentTarget.dataset.attachmentslug
		const attachment = _.find(attachments, {
			slug: attachmentSlug
		})

		try {
			downloadFile(this.props.sdk, this.props.card.id, attachment)
		} catch (error) {
			this.props.addNotification('danger', error.message || error)
		}
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

		if (
			isMessage &&
			isVisible &&
			this.props.onCardVisible
		) {
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
				<em>{text}</em> <strong>{this.props.actor ? this.props.actor.name : ''}</strong>
			</Txt>
		)
	}

	render () {
		const {
			card,
			actor,
			addNotification
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

		const message = getMessage(card)

		const attachments = getAttachments(card)

		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at
		const messageOverflows = this.state.messageHeight >= MESSAGE_COLLAPSED_HEIGHT

		return (
			<VisibilitySensor
				onChange={this.handleVisibilityChange}
			>
				<EventWrapper {...props} className={`event-card--${typeBase}`}>
					<EventButton onClick={this.openChannel} style={{
						borderLeftColor: helpers.colorHash(getTargetId(card))
					}}>
						<Avatar
							small
							name={actor ? actor.name : null}
							url={actor ? actor.avatarUrl : null}
							userStatus={_.get(actor, [ 'card', 'data', 'status' ])}
						/>

						{this.props.openChannel &&
							<Box
								tooltip={{
									placement: 'bottom',
									text: `Open ${card.type.split('@')[0]}`
								}}
							>
								<Icon
									style={{
										marginLeft: 6,
										marginTop: 16,
										fontSize: '18px',
										transform: 'scale(1, -1)',
										color: '#2e587a'
									}}
									name="share"
								/>
							</Box>
						}

					</EventButton>
					<Box
						pt={2}
						flex="1"
						pb={messageOverflows ? 0 : 2}
						style={{
							minWidth: 0
						}}
					>
						<Flex justifyContent="space-between" mb={1}>
							<Flex mt={isMessage ? 0 : 1} align="center" style={{
								lineHeight: 1.75
							}}>
								{isMessage && (
									<Txt
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

										{!actor && (
											<ActorPlaceholder>Loading...</ActorPlaceholder>
										)}
									</Txt>
								)}

								{!isMessage && this.getTimelineElement(card)}

								{Boolean(card.data) && Boolean(timestamp) && (
									<Txt
										color={Theme.colors.text.light}
										fontSize={1}
										ml="6px"
									>
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
											spin
											name="cog"
										/>
									</Txt>
								}
							</Flex>

							<span>
								<Button
									className="event-card--actions"
									px={2}
									plain
									onClick={this.toggleMenu}
									icon={<Icon name="ellipsis-v"/>}
								/>

								{this.state.showMenu && (
									<ContextMenu position="bottom" onClose={this.toggleMenu}>
										<React.Fragment>
											<ActionLink onClick={this.copyJSON} tooltip={{
												text: 'JSON copied!',
												trigger: 'click'
											}}>
												Copy as JSON
											</ActionLink>

											{isMessage && (
												<ActionLink onClick={this.copyRawMessage} tooltip={{
													text: 'Message copied!',
													trigger: 'click'
												}}>
													Copy raw message
												</ActionLink>
											)}

											{this.props.menuOptions}
										</React.Fragment>
									</ContextMenu>
								)}
							</span>
						</Flex>

						{Boolean(attachments) && _.map(attachments, (attachment) => {
							// If the mime type is of an image, display the file as an image
							// Additionally, if there are many attachments, skip trying to
							// render them
							if (attachments.length < 3 && attachment.mime && attachment.mime.match(/image\//)) {
								return (
									<AuthenticatedImage
										data-test="event-card__image"
										key={attachment.slug}
										cardId={card.id}
										fileName={attachment.slug}
										addNotification={addNotification}
									/>
								)
							}

							return (
								<Button
									key={attachment.url}
									data-attachmentslug={attachment.slug}
									onClick={this.downloadAttachment}
									light={card.type === 'whisper' || card.type === 'whisper@1.0.0'}
									data-test="event-card__file"
									mr={2}
									mb={2}
								>
									<Icon name="file-download" />
									<Txt monospace ml={2}>{attachment.name}</Txt>
								</Button>
							)
						})}

						{isMessage && Boolean(message) && (
							<MessageContainer
								ref={this.setMessageElement}
								whisper={card.type === 'whisper' || card.type === 'whisper@1.0.0'}
								proxy={actor && actor.proxy}
								py={2}
								px={3}
								mr={1}
							>
								<Markdown
									py='3px'
									style={{
										fontSize: 'inherit',
										overflow: messageOverflows ? 'hidden' : 'initial',
										maxHeight: !this.state.expanded && messageOverflows
											? MESSAGE_COLLAPSED_HEIGHT
											: 'none'
									}}
									data-test={card.pending ? '' : 'event-card__message'}
									flex={0}
								>
									{message}
								</Markdown>

								{messageOverflows && (
									<Button
										className="event-card__expand"
										plain
										width="100%"
										py={1}
										onClick={this.expand}
										style={this.state.expanded ? {} : {
											boxShadow: '0 -5px 5px -5px rgba(0,0,0,0.5)'
										}}
									>
										<Icon name={`chevron-${this.state.expanded ? 'up' : 'down'}`} />
									</Button>
								)}
							</MessageContainer>
						)}

						{!isMessage && Boolean(card.name) && (
							<Txt>{card.name}</Txt>
						)}
					</Box>
				</EventWrapper>
			</VisibilitySensor>
		)
	}
}
