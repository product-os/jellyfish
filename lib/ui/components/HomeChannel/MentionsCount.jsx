/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Box
} from 'rendition'
import styled from 'styled-components'

const MentionsCount = styled(Box) `
	background: ${(props) => {
		return props.theme.colors.secondary.main
	}};
	color: white;
	width: 18px;
	height: 18px;
	padding: 2px;
	border-radius: 100%;
	transform: translateX(6px);
	display: inline-flex;
	justify-content: center;
	align-items: center;
`

export default MentionsCount
