/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import styled from 'styled-components'
import {
	Flex
} from 'rendition'
import {
	tagStyle
} from '../Tag'

// Min-width is used to stop text from overflowing the flex container, see
// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
const EventWrapper = styled(Flex) `
	@keyframes pulse {
		0% {
			opacity: 0;
			outline-color: transparent;
		}
		100% {
			opacity: 0.5;
			outline-color: ${(props) => { return props.theme.colors.info.dark }};
		}
	}
	&.event--focused::after {
		content: '';
		opacity: 0;
		outline-offset: -4px;
		outline-width: 3px;
		outline-style: solid;
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 1;
		animation: pulse 0.7s 6;
		animation-direction: alternate;
	}
	position: relative;

	background: transparent;
	transition: 150ms ease-in-out background;
	&:hover {
		background: #dde1f080;
	}
	min-width: 0;
	word-break: break-word;
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
	.rendition-tag--read-by:after {
		content: attr(data-read-by-count);
		position: absolute;
    top: -4px;
    right: -4px;
    font-size: 10px;
	}
`

export default EventWrapper
