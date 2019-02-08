
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import React from 'react'
import Icon from './Icon'
import {
	IconButton
} from './IconButton'
export const CloseButton = (props) => {
	return (<IconButton plaintext square {...props}>
		<Icon name="times"/>
	</IconButton>)
}
