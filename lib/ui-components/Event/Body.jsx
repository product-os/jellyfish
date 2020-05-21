/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Txt
} from 'rendition'
import {
	HIDDEN_ANCHOR
} from '../Timeline'
import ImageMessage from './ImageMessage'
import MarkdownMessage from './MarkdownMessage'

const FRONT_MARKDOWN_IMG_RE = /\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]/g
const FRONT_HTML_IMG_RE = /\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+/g

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

export default class Body extends React.Component {
	render () {
		const {
			isMessage, card
		} = this.props

		const message = getMessage(card)
		const attachments = getAttachments(card)

		if (attachments.length > 0) {
			return _.map(attachments, (attachment, index) => {
				return (
					<ImageMessage
						{...this.props}
						attachments={attachments}
						attachment={attachment}
					/>
				)
			})
		}

		if (isMessage && Boolean(message)) {
			return <MarkdownMessage {...this.props} message={message} />
		}

		if (!isMessage && Boolean(card.name)) {
			return <Txt>{card.name}</Txt>
		}
		return null
	}
}
