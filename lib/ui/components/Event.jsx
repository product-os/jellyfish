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
	connect
} from 'react-redux'
import VisibilitySensor from 'react-visibility-sensor'
import {
	bindActionCreators
} from 'redux'
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
	actionCreators,
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
	ActionLink
} from '../shame/ActionLink'
import Gravatar from '../shame/Gravatar'
import Icon from '../shame/Icon'

const ActorPlaceholder = styled.span `
	width: 80px;
	line-height: inherit;
	background: #eee;
	display: inline-block;
	color: #eee;
	border-radius: 10px;
	text-align: center;
`

const MESSAGE_COLLAPSED_HEIGHT = 400

const getAttachments = (card) => {
	return _.get(card, [ 'data', 'payload', 'attachments' ], []).map((attachment) => {
		return {
			slug: attachment.url.split('/').pop(),
			mime: attachment.mime,
			name: attachment.name
		}
	})
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
	padding-left: 8px;
	padding-right: 8px;
	border-left-style: solid;
	border-left-width: 3px;
`

const FRONT_IMG_RE = /^\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]$/

const getTargetId = (card) => {
	return _.get(card, [ 'data', 'target' ]) || card.id
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

	if (message.includes('#jellyfish-hidden')) {
		return ''
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

	.rendition-tag--hl {
		position: relative;
		${tagStyle}
	}

	a .rendition-tag--hl {
		color: #333;
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

const MessageWrapper = styled(Box) `
	min-width: 0;
	position: relative;
	box-shadow: rgba(0, 0, 0, 0.25) 0px 0px 3px;
	margin: 0 8px 16px 0;
	border-radius: 10px;
`

const ProxyWrapper = styled(Box) `
	min-width: 0;
	position: relative;
	background: #f5fcff;
	box-shadow: #d7f3ff 0px 0px 0px 3px;
	margin: 0 8px 16px 0;
	border-radius: 10px;
`

const WhisperWrapper = styled(Box) `
	min-width: 0;
	position: relative;
	background: #333;
	color: white;
	border-radius: 4px;
	margin-right: 80px;
	margin-bottom: 8px;

	.event-card--actions,
	.event-card__expand {
		color: white;
	}

	.rendition-tag--hl {
		background: none;
	}

	a {
		color: white;
		text-decoration: underline;
	}

	a .rendition-tag--hl {
		color: white;
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
			actor: null,
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

		const createCard = _.find(_.get(this.props.card, [ 'links', 'has attached element' ]), {
			type: 'create'
		})

		const actorId = _.get(this.props.card, [ 'data', 'actor' ]) || _.get(createCard, [ 'data', 'actor' ])
		const actor = await this.props.actions.getActor(actorId)
		this.setState({
			actor
		})
	}

	downloadAttachment (event) {
		const attachments = getAttachments(this.props.card)
		const attachmentSlug = event.currentTarget.dataset.attachmentslug
		const attachment = _.find(attachments, {
			slug: attachmentSlug
		})

		const {
			slug,
			name,
			mime
		} = attachment

		sdk.getFile(this.props.card.id, slug)
			.then((data) => {
				const blob = new Blob([ data ], {
					type: mime
				})

				saveAs(blob, name)
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error)
			})
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

				const trimmed = text.slice(1)

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
		if (isVisible && this.props.onCardVisible) {
			this.props.onCardVisible(this.props.card)
		}
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
			<em>{text}</em> <strong>{this.state.actor ? this.state.actor.name : ''}</strong>
		</Txt>)
	}

	render () {
		const {
			card
		} = this.props
		const {
			actor
		} = this.state
		const props = _.omit(this.props, [
			'card',
			'menuOptions',
			'onCardVisible',
			'openChannel'
		])
		const isMessage = card.type === 'message' || card.type === 'whisper'

		let InnerWrapper = MessageWrapper
		if (card.type === 'whisper') {
			InnerWrapper = WhisperWrapper
		} else if (actor && actor.proxy) {
			InnerWrapper = ProxyWrapper
		}

		const message = getMessage(card)

		const attachments = getAttachments(card)

		if (_.get(card, [ 'data', 'payload', 'file' ])) {
			attachments.push(card.data.payload.file)
		}

		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at
		const messageOverflows = this.state.messageHeight >= MESSAGE_COLLAPSED_HEIGHT

		return (
			<VisibilitySensor
				onChange={this.handleVisibilityChange}
			>
				<EventWrapper {...props} className={`event-card--${card.type}`}>
					<EventButton onClick={this.openChannel} style={{
						borderLeftColor: helpers.colorHash(getTargetId(card))
					}}>
						<Gravatar.default small email={actor ? actor.email : null}/>
					</EventButton>
					<InnerWrapper
						flex="1"
						pt={2}
						px="12px"
						pb={messageOverflows ? 0 : 2}
					>
						<Flex justifyContent="space-between" mb={2}>
							<Flex mt={isMessage ? 0 : '5px'} align="center">
								{isMessage && (
									<Txt
										tooltip={actor ? actor.email : 'loading...'}
									>
										<strong>
											{actor
												? actor.name
												: <ActorPlaceholder>Loading...</ActorPlaceholder>
											}
										</strong>
									</Txt>
								)}

								{!isMessage && this.getTimelineElement(card)}

								{Boolean(card.data) && Boolean(timestamp) && (
									<Txt
										color={card.type === 'whisper' ? 'white' : Theme.colors.text.light}
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
									mr={card.type === 'whisper' ? -12 : -1}
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

											{this.props.menuOptions}
										</React.Fragment>
									</ContextMenu>
								)}
							</span>
						</Flex>

						{Boolean(attachments) && _.map(attachments, (attachment) => {
							// If the mime type is of an image, display the file as an image
							// Additionally, if there are many attachements, skip trying to
							// render them
							if (attachments.length < 3 && attachment.mime && attachment.mime.match(/image\//)) {
								return (
									<AuthenticatedImage
										data-test="event-card__image"
										key={attachment.slug}
										cardId={card.id}
										fileName={attachment.slug}
									/>
								)
							}

							return (
								<Button
									key={attachment.url}
									data-attachmentslug={attachment.slug}
									onClick={this.downloadAttachment}
									light={card.type === 'whisper'}
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
							<Box
								ref={this.setMessageElement}
								py='3px'
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
							</Box>
						)}

						{!isMessage && Boolean(card.name) && (
							<Txt>{card.name}</Txt>
						)}
					</InnerWrapper>
				</EventWrapper>
			</VisibilitySensor>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'getActor'
			]), dispatch)
	}
}

export default connect(null, mapDispatchToProps)(Event)
