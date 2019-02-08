
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import {
	Flex
} from 'rendition'
import styled from 'styled-components'
export default styled(Flex) `
	> * {
		border-radius: 0;
		margin-right: -1px;

		&:first-child {
			border-top-left-radius: ${(props) => { return props.theme.radius }}px;
			border-bottom-left-radius: ${(props) => { return props.theme.radius }}px;
		}

		&:last-child {
			border-top-right-radius: ${(props) => { return props.theme.radius }}px;
			border-bottom-right-radius: ${(props) => { return props.theme.radius }}px;
		}
	}
`
