/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Flex
} from 'rendition'
import Icon from './shame/Icon'

const MirrorIconWrapper = styled(Flex) `
	margin: 0 0 2px 6px;
	font-size: 80%;
	opacity: 0.3;
	transition: opacity linear 0.5s;
	color: ${(props) => { return props.theme.colors.primary.light }};
	&.synced {
		opacity: 1;
	}
`

export default function MirrorIcon ({
	threadIsMirrored, mirrors
}) {
	if (!threadIsMirrored) {
		return null
	}
	const synced = !_.isEmpty(mirrors)
	return (
		<MirrorIconWrapper
			data-test="mirror-icon"
			className={synced ? 'synced' : 'unsynced'}
			tooltip={synced ? 'Synced' : 'Not yet synced'}
		>
			<Icon name="check" />
		</MirrorIconWrapper>
	)
}
