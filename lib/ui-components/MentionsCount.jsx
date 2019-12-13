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
	background: rgb(255, 197, 35);
	color: white;
	width: auto;
	min-width: 18px;
	height: 18px;
	padding: 0px 4px;
	border-radius: 18px;
	transform: translateX(6px);
	display: inline-flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	left: 30px;
	bottom: 10px;
	font-size: ${(props) => {
		return getFontSize(props.children)
	}}px;
`

export default MentionsCount
