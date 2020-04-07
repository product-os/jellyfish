/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Txt,
	Theme
} from 'rendition'
import styled from 'styled-components'

export const tagStyle = `
	background: #efefef;
	padding: 2px 5px 1px;
	border-radius: ${Theme.radius}px;
	border: 1px solid #c3c3c3;
	line-height: 1;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	max-width: 180px;

	> a {
		display: inline
	}
`

const StyledTag = styled(Txt.span) `
	${tagStyle}
`

export const TAG_SYMBOL = '#'

export default function Tag ({
	children,
	...rest
}) {
	let content = children

	if (content && typeof content === 'string' && !content.startsWith(TAG_SYMBOL)) {
		content = `${TAG_SYMBOL}${content}`
	}

	return (
		<StyledTag {...rest}>{content}</StyledTag>
	)
}
