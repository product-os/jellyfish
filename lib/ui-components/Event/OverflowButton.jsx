/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Button
} from 'rendition'
import styled from 'styled-components'

const OverflowButton = styled(Button) `
	color: inherit;

	&:hover {
		color: inherit !important;
	}

	${(expanded) => {
		return expanded ? {} : 'boxShadow: \'0 -5px 5px -5px rgba(0,0,0,0.5)\''
	}}
`

export default OverflowButton
