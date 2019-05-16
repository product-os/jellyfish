/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button
} from 'rendition'
import Icon from './Icon'

export const CloseButton = (props) => {
	return (
		<Button
			{...props}
			plain
			icon={<Icon name="times"/>}
		/>
	)
}
