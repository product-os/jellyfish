/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Flex
} from 'rendition'

const AuthWrapper = styled(Flex) `
	height: 100%;
	background: ${(props) => { return props.theme.colors.tertiary.main }};
`

const AuthContainer = (props) => {
	const {
		children
	} = props
	return (
		<AuthWrapper
			justifyContent={[ 'stretch', 'center' ]}
			alignItems={[ 'stretch', 'center' ]}
		>
			{ children }
		</AuthWrapper>
	)
}

export default AuthContainer
