/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Box
} from 'rendition'
import styled from 'styled-components'

const getFontSize = (string) => {
	if (string.length === 1) {
		return 14
	}

	if (string.length === 2) {
		return 12
	}

	return 10
}

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
	font-size: ${(props) => {
		return getFontSize(props.children)
	}}px;
`

export default MentionsCount
