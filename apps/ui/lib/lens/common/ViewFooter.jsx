/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex,
	Button
} from 'rendition'
import styled from 'styled-components'

const Footer = styled(Flex) `
	border-top: 1px solid #eee;
`

export const ViewFooter = ({
	type,
	onAddCard
}) => {
	return (
		<Footer
			flex={0}
			p={3}
			justifyContent="flex-end"
		>
			<Button
				success={true}
				className={`btn--add-${type.slug}`}
				onClick={onAddCard}
			>
				Add {type.name || type.slug}
			</Button>
		</Footer>
	)
}
