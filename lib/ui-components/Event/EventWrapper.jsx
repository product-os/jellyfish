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
	min-width: 0;
	word-break: break-word;
	.event-card--actions {
		opacity: 0;
		transition: 150ms ease-in-out opacity;
	}
	&:hover {
		.event-card--actions {
			opacity: 1;
		}
	}
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

	${({
		squashTop
	}) => {
		return squashTop ? `
			.event-card--timestamp {
				opacity: 0;
				transition: 150ms ease-in-out opacity;
			}
			&:hover {
				.event-card--timestamp {
					opacity: 1;
				}
			}
		` : ''
	}}
`

export default EventWrapper
