/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import * as rendition from 'rendition'
import styled from 'styled-components'

export const tagStyle = `
	background: #efefef;
	padding: 2px 2px;
	border-radius: ${rendition.Theme.radius}px;
	border: 1px solid #c3c3c3;
	line-height: 1;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	max-width: 180px;
`

export const Tag = styled(rendition.Txt.span) `
	${tagStyle}
`
