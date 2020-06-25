/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import styled from 'styled-components'
import {
	Box
} from 'rendition'
import {
	px
} from './services/helpers'

export default styled(Box) `
	padding-top: ${(props) => { return px(props.theme.space[2]) }};
	flex: 1;
	overflow-y: auto;
	border-top: 1px solid ${(props) => { return props.theme.colors.border }};
	background-color: ${(props) => { return props.theme.colors.quartenary.light }};
`
