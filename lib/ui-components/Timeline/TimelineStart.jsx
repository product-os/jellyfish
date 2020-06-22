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

const StyledBox = styled(Box)(({
	primary
}) => {
	return {
		width: '100%',
		textAlign: 'center',
		opacity: 0.8
	}
})

const TimelineStart = ({
	reachedBeginningOfTimeline
}) => {
	if (reachedBeginningOfTimeline) {
		return (
			<StyledBox
				pb={14}
				pt={14}
			>
				<Txt>Beginning of Timeline</Txt>
			</StyledBox>
		)
	}
	return null
}

export default TimelineStart
