/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const copy = require('copy-to-clipboard')
const {
	circularDeepEqual
} = require('fast-equals')
const _ = require('lodash')
const Mark = require('mark.js')
const React = require('react')
const rendition = require('rendition')
const Markdown = require('rendition/dist/extra/Markdown')
const styledComponents = require('styled-components')
const AuthenticatedImage = require('../components/AuthenticatedImage')
const ContextMenu = require('../components/ContextMenu')
const Tag = require('../components/Tag')
const helpers = require('../services/helpers')
const storeHelpers = require('../services/store-helpers')
const ActionLink = require('../shame/ActionLink')
const Gravatar = require('../shame/Gravatar')
const Icon = require('../shame/Icon')
const IconButton = require('../shame/IconButton')
const tagMatchRE = helpers.createPrefixRegExp('@|#|!')
const EventButton = styledComponents.default.button `
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

const getTarget = (card) => {
	return _.get(card, [ 'links', 'is attached to', '0' ]) || card
}

const EventWrapper = styledComponents.default(rendition.Flex) `
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
		${Tag.tagStyle}
	}

	.rendition-tag-hl--self {
		background: #FFF1C2;
		border-color: #FFC19B;
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
		this.state = {
			actor: storeHelpers.getActor(this.props.card.data.actor),
			showMenu: false
		}
	}
	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) ||
            !circularDeepEqual(nextProps, this.props)
	}
	componentDidMount () {
		this.processText()
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

		// TODO: Update @types/mark.js to include the 'ignoreGroups' options
		// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/31334
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
				<rendition.Txt color={rendition.Theme.colors.text.light}>
					<strong>{targetCard.slug.replace('user-', '')}</strong> joined
				</rendition.Txt>
			)
		}
		let text = `${targetCard.name || targetCard.slug || targetCard.type || ''}`
		if (card.type === 'create') {
			text += ' created by'
		}
		if (card.type === 'update') {
			text += ' updated by'
		}
		return (<rendition.Txt color={rendition.Theme.colors.text.light}>
			<em>{text}</em> <strong>{this.state.actor.name}</strong>
		</rendition.Txt>)
	}
	render () {
		const {
			card
		} = this.props
		const props = _.omit(this.props, [ 'card', 'openChannel' ])
		const isMessage = card.type === 'message' || card.type === 'whisper'
		const messageStyle = card.type === 'whisper' ? {
			background: '#eee',
			borderRadius: 10,
			padding: '8px 16px',
			marginRight: 80,
			marginBottom: 8,

			// Min-width is used to stop text from overflowing the flex container, see
			// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
			minWidth: 0
		} : {
			minWidth: 0,
			boxShadow: 'rgba(0, 0, 0, 0.25) 0px 0px 3px',
			padding: '8px 12px',
			margin: '0 8px 16px 0',
			borderRadius: 10
		}

		if (this.state.actor.proxy) {
			messageStyle.background = '#f5fcff'
			messageStyle.border = '3px solid #d7f3ff'
			messageStyle.padding = '8px 12px'
			messageStyle.margin = '0 8px 16px 0'
			messageStyle.borderRadius = 10
		}

		return (<EventWrapper {...props} className={`event-card--${card.type}`}>
			<EventButton onClick={this.openChannel} style={{
				borderLeftColor: helpers.colorHash(getTarget(card).id)
			}}>
				<Gravatar.default small email={this.state.actor.email}/>
			</EventButton>
			<rendition.Box flex="1" style={messageStyle} pb={3} pr={3}>
				<rendition.Flex justify="space-between" mb={2}>
					<rendition.Flex mt={isMessage ? 0 : '5px'} align="center">
						{isMessage && (<strong>{this.state.actor.name}</strong>)}

						{!isMessage && this.getTimelineElement(card)}

						{Boolean(card.data) && Boolean(card.data.timestamp) && (
							<rendition.Txt color={rendition.Theme.colors.text.light} fontSize={1} ml="6px">
								{helpers.formatTimestamp(card.data.timestamp, true)}
							</rendition.Txt>
						)}
					</rendition.Flex>

					<span>
						<IconButton.IconButton
							className="event-card--actions"
							px={2}
							mr={card.type === 'whisper' ? -12 : -1}
							plaintext
							onClick={this.toggleMenu}>
							<Icon.default name="ellipsis-v"/>

						</IconButton.IconButton>

						{this.state.showMenu && (
							<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									<ActionLink.ActionLink onClick={this.copyJSON} tooltip={{
										text: 'JSON copied!',
										trigger: 'click'
									}}>
												Copy as JSON
									</ActionLink.ActionLink>
								</React.Fragment>
							</ContextMenu.ContextMenu>
						)}
					</span>
				</rendition.Flex>

				{isMessage && Boolean(card.data.payload.message) && (
					<div ref={this.setMessageElement}>
						<Markdown.Markdown
							style={{
								fontSize: 'inherit'
							}}
							className="event-card__message"
						>
							{card.data.payload.message}
						</Markdown.Markdown>
					</div>
				)}
				{isMessage && Boolean(card.data.payload.file) && (
					<AuthenticatedImage.AuthenticatedImage cardId={card.id} fileName={card.data.payload.file}/>
				)}
			</rendition.Box>
		</EventWrapper>)
	}
}
exports.Event = Event
