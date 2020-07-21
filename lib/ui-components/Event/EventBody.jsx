/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Button, Txt
} from 'rendition'
import {
	Markdown,
	defaultSanitizerOptions
} from 'rendition/dist/extra/Markdown'
import {
	HIDDEN_ANCHOR
} from '../Timeline'
import Icon from '../shame/Icon'
import MessageContainer from './MessageContainer'
import {
	PlainAutocompleteTextarea
} from '../Timeline/MessageInput'
import Attachments from './Attachments'

const MESSAGE_Y_SPACE = '3px'
const MAX_IMAGE_SIZE = '500px'

const EditingAutocompleteTextarea = styled(PlainAutocompleteTextarea) `
	margin: ${MESSAGE_Y_SPACE} 0;
`

const StyledMarkdown = styled(Markdown)(({
	messageOverflows,
	messageCollapsedHeight,
	expanded
}) => {
	return {
		fontSize: 'inherit',
		maxHeight: !expanded && messageOverflows
			? `${messageCollapsedHeight}px`
			: 'none',
		overflow: messageOverflows ? 'hidden' : 'initial'
	}
})

const FRONT_MARKDOWN_IMG_RE = /\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]/g
const FRONT_HTML_IMG_RE = /\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+/g
const IMAGE_URL_RE = /^https?:\/\/.*\.(?:png|jpg|gif)(?:\?\S*)*$/

const OverflowButton = styled(Button) `
	color: inherit;

	&:hover {
		color: inherit !important;
	}

	${(expanded) => {
		return expanded ? {} : 'boxShadow: \'0 -5px 5px -5px rgba(0,0,0,0.5)\''
	}}
`

export const getMessage = (card) => {
	const message = _.get(card, [ 'data', 'payload', 'message' ], '')

	if (message.trim().match(IMAGE_URL_RE)) {
		return `![image](${message.trim()})`
	}

	// Fun hack to extract attached images embedded in HTML from synced front messages
	if (message.includes('<img src="/api/1/companies/resin_io/attachments')) {
		return message.replace(FRONT_HTML_IMG_RE, (source) => {
			return `https://app.frontapp.com${source}`
		})
	}

	// Fun hack to extract attached images from synced front messages embedded in
	// a different way
	if (message.match(FRONT_MARKDOWN_IMG_RE)) {
		return message.replace(FRONT_MARKDOWN_IMG_RE, (source) => {
			return `![Attached image](https://app.frontapp.com${source.slice(
				1,
				-1
			)})`
		})
	}

	return message
		.split('\n')
		.filter((line) => {
			return !line.includes(HIDDEN_ANCHOR)
		})
		.join('\n')
}

const sanitizerOptions = _.defaultsDeep({
	allowedAttributes: {
		img: _.get(defaultSanitizerOptions, [ 'allowedAttributes', 'img' ], []).concat('style')
	},
	transformTags: {
		img: (tagName, attribs) => {
			return {
				tagName,
				attribs: {
					...attribs,
					style: `
					max-width: min(${MAX_IMAGE_SIZE}, 100%);
					max-height: ${MAX_IMAGE_SIZE};
					`
				}
			}
		}
	}
}, defaultSanitizerOptions)

export default class EventBody extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			expanded: false
		}

		this.expand = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}
	}

	render () {
		const {
			squashTop,
			squashBottom,
			enableAutocomplete,
			sendCommand,
			types,
			user,
			sdk,
			card,
			actor,
			isMessage,
			editedMessage,
			updating,
			onUpdateDraft,
			onSaveEditedMessage,
			addNotification,
			messageOverflows,
			setMessageElement,
			messageCollapsedHeight
		} = this.props
		const {
			expanded
		} = this.state

		const message = getMessage(card)

		return (
			<React.Fragment>
				<Attachments
					card={card}
					actor={actor}
					sdk={sdk}
					addNotification={addNotification}
					maxImageSize={MAX_IMAGE_SIZE}
					squashTop={squashTop}
					squashBottom={squashBottom}
				/>
				{
					isMessage && Boolean(message) && (
						<MessageContainer
							ref={setMessageElement}
							card={card}
							actor={actor}
							editing={editedMessage !== null}
							squashTop={squashTop}
							squashBottom={squashBottom}
							py={2}
							px={3}
							mr={1}
						>
							{editedMessage !== null && !updating ? (
								<EditingAutocompleteTextarea
									data-test="event__textarea"
									enableAutocomplete={enableAutocomplete}
									sdk={sdk}
									types={types}
									user={user}
									autoFocus
									sendCommand={sendCommand}
									value={editedMessage}
									onChange={onUpdateDraft}
									onSubmit={onSaveEditedMessage}
								/>
							) : (
								<StyledMarkdown
									expanded={expanded}
									messageOverflows={messageOverflows}
									messageCollapsedHeight={messageCollapsedHeight}
									py={MESSAGE_Y_SPACE}
									data-test={card.pending || updating ? 'event-card__message-draft' : 'event-card__message'}
									flex={0}
									sanitizerOptions={sanitizerOptions}
								>
									{updating ? editedMessage : message}
								</StyledMarkdown>
							)}
							{messageOverflows && (
								<OverflowButton
									className="event-card__expand"
									plain
									width="100%"
									py={1}
									onClick={this.expand}
									expanded={expanded}
								>
									<Icon name={`chevron-${expanded ? 'up' : 'down'}`} />
								</OverflowButton>
							)}
						</MessageContainer>
					)
				}
				{
					!isMessage && Boolean(card.name) && (
						<Txt>{card.name}</Txt>
					)
				}
			</React.Fragment>
		)
	}
}
