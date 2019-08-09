/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const {
	parseMarkdown
} = require('rendition/dist/extra/utils')

const TAG_MATCH_RE = /(\s|^)([@|#|!][a-z\d-_/]+)/gim
const FRONT_IMG_RE = /^\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]$/

// Preprocess message content, wrapping tags in spans and fixing broken front
// image links. This code is used by both the frontend message rendering in
// Event.jsx and in server-side message rendering.
exports.preprocessMessage = (raw, readBy = []) => {
	const message = raw.replace(TAG_MATCH_RE, (match, p1, p2) => {
		let className = 'rendition-tag--hl'

		if (p2.trim().charAt(0) !== '#') {
			const userSlug = `user-${p2.trim().slice(1)}`

			if (readBy.length && _.includes(readBy, userSlug)) {
				className += ' rendition-tag--read'
			}

			className += ` rendition-tag--${userSlug}`
		}

		return `<span class="${className}">${p2}</span>`
	})

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

	if (message.includes('#jellyfish-hidden')) {
		return ''
	}

	return message
}

exports.parseMarkdownFromCardData = (cardData) => {
	const source = _.get(cardData, [ 'payload', 'message' ])
	if (source) {
		const readBy = _.get(cardData, [ 'readBy' ], [])
		const parsed = parseMarkdown(exports.preprocessMessage(source, readBy))
		cardData.payload.html = parsed
	}

	return cardData
}
