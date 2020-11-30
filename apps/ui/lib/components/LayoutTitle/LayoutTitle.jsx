/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex, Box
} from 'rendition'
import {
	Header
} from './Header'
import {
	SubHeader
} from './SubHeader'

const LayoutTitle = ({
	title, card
}) => {
	// If we have neither props, don't render
	if (!title && !card) {
		return null
	}

	return (
		<Flex
			flex={1}
			alignSelf={[ 'flex-start', 'flex-start', 'inherit' ]}
			my={[ 2, 2, 0 ]}
		>
			{title}

			{!title && Boolean(card) && (
				<Box>
					<Header card={card} />
					<SubHeader card={card} />
				</Box>
			)}
		</Flex>
	)
}

export default LayoutTitle
