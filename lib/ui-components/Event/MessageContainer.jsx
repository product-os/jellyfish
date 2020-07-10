/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import styled from 'styled-components'
import {
	Box
} from 'rendition'

const MessageContainer = styled(Box) `
	border-radius: 6px;
	border-top-left-radius: 0;
	box-shadow: -5px 4.5px 10.5px 0 rgba(152, 173, 227, 0.08);
	a {
		color: inherit;
		text-decoration: underline;
	}
	img {
		background-color: transparent !important;
		&.emoji {
			width: 20px;
			height: 20px;
			vertical-align: middle;
		}
	}
	code {
		color: #333;
		background-color: #f6f8fa;
	}
	${({
		card, actor, theme, editing
	}) => {
		if (editing) {
			return (card.type === 'whisper' || card.type === 'whisper@1.0.0') ? `
				border: solid 0.5px ${theme.colors.tertiary.light};
				background: #2E587ADD;
				color: white;
			` : `
				border: solid 0.5px ${theme.colors.gray.main};
				background: ${theme.colors.gray.light};
				color: ${theme.colors.text.main};
			`
		}
		if (card.type === 'whisper' || card.type === 'whisper@1.0.0') {
			return `
				background: ${theme.colors.secondary.main};
				color: white;
				border: solid 0.5px ${theme.colors.tertiary.main};
				blockquote {
					color: lightgray;
				}
			`
		}

		if (actor && actor.proxy) {
			return `
				background: ${theme.colors.quartenary.main};
				color: ${theme.colors.text.dark};
			`
		}

		return `
			border: solid 0.5px #e8ebf2;
			background: white;
		`
	}}

	${({
		squashTop
	}) => {
		return squashTop
			? `
				border-top-right-radius: 0;
				border-top-left-radius: 0;
			` : ''
	}
}}

	${({
		squashBottom
	}) => {
		return squashBottom
			? `
				border-bottom-right-radius: 0;
				border-bottom-left-radius: 0;
				border-bottom-color: transparent;
			` : ''
	}
}}
`

export default MessageContainer
