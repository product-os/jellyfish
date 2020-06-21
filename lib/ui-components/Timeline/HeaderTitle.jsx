/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Txt
} from 'rendition'
import styled from 'styled-components'

const StyledBox = styled(Box) `
	min-width: 0;
	overflow: 'hidden';
	text-overflow: 'ellipsis';
	white-space: 'nowrap';
`

const HeaderTitle = ({
	title
}) => {
	if (title) {
		return (
			<StyledBox flex={1} mr={2}>
				<Txt.span tooltip={title}>{title}</Txt.span>
			</StyledBox>
		)
	}
	return null
}

export default HeaderTitle
