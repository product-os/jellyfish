/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Box,
	Flex,
	Img
} from 'rendition'
import UserIcon from 'react-icons/lib/fa/user'

const dimensions = (props) => {
	const size = props.small ? 24 : 36
	return `
		width: ${size}px;
		height: ${size}px;
	`
}

const OuterWrapper = styled(Box) `
	box-sizing: content-box;
	${dimensions}
`

const InnerWrapper = styled(Box) `
	border-radius: 100%;
	overflow: hidden;
	width: 100%;
	height: 100%;
`

const IconWrapper = styled(Flex) `
	width: 100%;
	height: 100%;
	background: ${(props) => { return props.theme.colors.quartenary.dark }};
	color: white;
	flex-direction: column;
	justify-content: center;
    align-items: center;
`

export default function Avatar ({
	url,
	...rest
}) {
	return (
		<OuterWrapper {...rest}>
			<InnerWrapper>
				{url ? (
					<Img src={url} />
				) : (
					<IconWrapper>
						<UserIcon name="user" />
					</IconWrapper>
				)}
			</InnerWrapper>
		</OuterWrapper>
	)
}
