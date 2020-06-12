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
	saveAs
} from 'file-saver'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	HIDDEN_ANCHOR
} from '../Timeline'
import Icon from '../shame/Icon'
import AuthenticatedImage from '../AuthenticatedImage'
import MessageContainer from './MessageContainer'
import {
	PlainAutocompleteTextarea
} from '../Timeline/MessageInput'

const MESSAGE_Y_SPACE = '3px'

const EditingAutocompleteTextarea = styled(PlainAutocompleteTextarea) `
	margin: ${MESSAGE_Y_SPACE} 0;
`

const FRONT_MARKDOWN_IMG_RE = /\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]/g
const FRONT_HTML_IMG_RE = /\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+/g

const downloadFile = async (sdk, cardId, file) => {
	const {
		slug, name, mime
	} = file

	const data = await sdk.getFile(cardId, slug)
	const blob = new Blob([ data ], {
		type: mime
	})

	saveAs(blob, name)
}

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

const getAttachments = (card) => {
	// Start by mapping sync attachments
	const attachments = _.get(card, [ 'data', 'payload', 'attachments' ], []).map(
		(attachment) => {
			return {
				slug: attachment.url.split('/').pop(),
				mime: attachment.mime,
				name: attachment.name
			}
		}
	)

	// Attach files directly uploaded in Jellyfish
	if (_.get(card, [ 'data', 'payload', 'file' ])) {
		attachments.push(card.data.payload.file)
	}

	return attachments
}

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

		this.downloadAttachments = (event) => {
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

		const message = getMessage(card)
		const attachments = getAttachments(card)

		return (
			<React.Fragment>
				{
					attachments.length > 0 && _.map(attachments, (attachment, index) => {
						// If the mime type is of an image, display the file as an image
						// Additionally, if there are many attachments, skip trying to
						// render them
						if (
							attachments.length < 3 &&
					attachment.mime &&
					attachment.mime.match(/image\//)
						) {
							return (
								<MessageContainer
									key={`${attachment.slug}-${index}`}
									card={card}
									actor={actor}
									squashTop={squashTop}
									squashBottom={squashBottom}
									pt={2}
									px={3}
									mr={1}
								>
									<AuthenticatedImage
										data-test="event-card__image"
										cardId={card.id}
										fileName={attachment.slug}
										addNotification={addNotification}
										sdk={sdk}
										mimeType={attachment.mime}
									/>
								</MessageContainer>
							)
						}

						return (
							<Button
								key={`${attachment.url}-${index}`}
								data-attachmentslug={attachment.slug}
								onClick={this.downloadAttachments}
								secondary={card.type.split('@')[0] === 'whisper'}
								data-test="event-card__file"
								mr={2}
								mb={2}
							>
								<Icon name="file-download" />
								<Txt monospace ml={2}>
									{attachment.name}
								</Txt>
							</Button>
						)
					})
				}
				{
					isMessage && Boolean(message) && (
						<MessageContainer
							ref={setMessageElement}
							card={card}
							actor={actor}
							editing={Boolean(editedMessage)}
							squashTop={squashTop}
							squashBottom={squashBottom}
							py={2}
							px={3}
							mr={1}
						>
							{editedMessage && !updating ? (
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
									onClickOutside={onSaveEditedMessage}
								/>
							) : (
								<Markdown
									py={MESSAGE_Y_SPACE}
									style={{
										fontSize: 'inherit',
										overflow: messageOverflows ? 'hidden' : 'initial',
										maxHeight:
						!this.state.expanded && messageOverflows
							? messageCollapsedHeight
							: 'none'
									}}
									data-test={card.pending || updating ? 'event-card__message-draft' : 'event-card__message'}
									flex={0}
								>
									{updating ? editedMessage : message}
								</Markdown>
							)}
							{messageOverflows && (
								<OverflowButton
									className="event-card__expand"
									plain
									width="100%"
									py={1}
									onClick={this.expand}
									expanded={this.state.expanded}
								>
									<Icon name={`chevron-${this.state.expanded ? 'up' : 'down'}`} />
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
