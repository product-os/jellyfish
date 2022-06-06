import styled from 'styled-components';
import { Box, BoxProps } from 'rendition';
import type { Contract } from '@balena/jellyfish-types/build/core';
import { isPrivateTimelineEvent } from '../../../services/helpers';

interface MessageContainerProps extends BoxProps {
	card: Contract;
	actor?: { proxy?: boolean } | null;
	editing?: boolean;
	error?: boolean;
	squashTop?: boolean;
	squashBottom?: boolean;
	truncated?: boolean;
}

const MessageContainer = styled(Box)<MessageContainerProps>`
	min-width: 0;
	border-radius: 12px;
	border-top-left-radius: 0;
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
	}
	${({ card, actor, theme, editing, error }) => {
		if (error) {
			return `
				color: white;
				background: red;
			`;
		}
		if (editing) {
			return card.type === 'whisper' || card.type === 'whisper@1.0.0'
				? `
				border: solid 0.5px ${theme.colors.tertiary.light};
				background: #2E587ADD;
				color: white;
			`
				: `
				border: solid 0.5px ${theme.colors.gray.main};
				background: ${theme.colors.gray.light};
				color: ${theme.colors.text.main};
			`;
		}
		if (isPrivateTimelineEvent(card.type)) {
			return `
				background: ${theme.colors.secondary.main};
				color: white;
				border: solid 0.5px ${theme.colors.tertiary.main};
				blockquote {
					color: lightgray;
				}
			`;
		}

		if (actor && actor.proxy) {
			return `
				background: ${theme.colors.quartenary.main};
				color: ${theme.colors.text.dark};
			`;
		}

		return `
			background: ${theme.colors.background};
		`;
	}}

	${({ squashTop }) => {
		return squashTop
			? `
				border-top-right-radius: 0;
				border-top-left-radius: 0;
			`
			: '';
	}}}

	${({ squashBottom }) => {
		return squashBottom
			? `
				border-bottom-right-radius: 0;
				border-bottom-left-radius: 0;
				border-bottom-color: transparent;
			`
			: '';
	}}

	${({ truncated }) => {
		return truncated
			? `
			border-right-width: 0;
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
			p {
				line-height: 1.2;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		`
			: '';
	}}
}
`;

export default MessageContainer;
