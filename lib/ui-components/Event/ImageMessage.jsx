/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Button, Txt
} from 'rendition'
import {
	saveAs
} from 'file-saver'
import Icon from '../shame/Icon'
import AuthenticatedImage from '../AuthenticatedImage'
import MessageContainer from './MessageContainer'

const MAX_NUMBER_OF_IMAGES = 3

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

export default class ImageMessage extends React.Component {
	constructor (props) {
		super(props)

		this.downloadAttachment = this.downloadAttachment.bind(this)
	}

	downloadAttachment (event) {
		const attachments = this.props.getAttachments(this.props.card)
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

	render () {
		const {
			attachments,
			attachment,
			card,
			actor,
			index,
			addNotification
		} = this.props

		const tooManyAttachments = attachments.length > MAX_NUMBER_OF_IMAGES
		const isImage = attachment.mime && attachment.mime.match(/image\//)

		if (!tooManyAttachments && isImage) {
			return (
				<MessageContainer
					key={`${attachment.slug}-${index}`}
					card={card}
					actor={actor}
					py={2}
					px={3}
					mr={1}
				>
					<AuthenticatedImage
						data-test="event-card__image"
						cardId={card.id}
						fileName={attachment.slug}
						addNotification={addNotification}
					/>
				</MessageContainer>
			)
		}
		return (
			<Button
				key={`${attachment.url}-${index}`}
				data-attachmentslug={attachment.slug}
				onClick={this.downloadAttachment}
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
	}
}
