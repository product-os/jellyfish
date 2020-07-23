/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex
} from 'rendition'
import Icon from '../shame/Icon'

const Loading = () => {
	return (
		<Flex
			justifyContent="center"
		>
			<Icon spin name="cog" />
		</Flex>
	)
}

export default Loading
