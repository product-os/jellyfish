/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Container,
	Box,
	Flex,
	Img
} from 'rendition'

const AuthBox = styled(Box) `
	max-width: 470px;
`
const ShadowBox = styled(Flex) `
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`

const Icon = styled(Img) `
  height: 70;
`

const AuthContainer = (props) => {
	const {
		children
	} = props
	return (
		<React.Fragment>
			<ShadowBox
				justifyContent="space-between"
				align="center"
			>
				<Box>
					<Icon
						width={70}
						pl={2}
						p={10}
						src="/icons/jellyfish-icon.svg"
					/>
				</Box>
			</ShadowBox>
			<Container mt={4}>
				<AuthBox mx="auto">
					{ children }
				</AuthBox>
			</Container>
		</React.Fragment>
	)
}

export default AuthContainer
