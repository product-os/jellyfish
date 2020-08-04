/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex
} from 'rendition'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'

export const Loader = (props) => {
	return (
		<Flex justifyContent="center" alignItems="center" {...props}>
			<Icon spin name="cog" />
		</Flex>
	)
}
