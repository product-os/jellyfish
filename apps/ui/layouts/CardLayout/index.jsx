/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Flex,
	Heading
} from 'rendition'
import CardActions from '../../../../lib/ui-components/CardActions'
import {
	CloseButton
} from '@jellyfish/ui-components/shame/CloseButton'
import Column from '@jellyfish/ui-components/shame/Column'

export default function CardLayout (props) {
	const {
		actionItems,
		card,
		channel,
		children,
		noActions,
		title,
		overflowY
	} = props

	const typeBase = card.type && card.type.split('@')[0]

	return (
		<Column
			className={`column--${typeBase || 'unknown'} column--slug-${card.slug || 'unkown'}`}
			overflowY={overflowY}
			data-test={props['data-test']}
		>
			<Box p={3} pb={0}>
				<Flex justifyContent="space-between">
					{title}

					{!title && (
						<Heading.h4>
							{card.name || card.slug || card.type}
						</Heading.h4>
					)}

					<Flex align="baseline">
						{!noActions && (
							<CardActions card={card}>
								{actionItems}
							</CardActions>
						)}

						<CloseButton
							onClick={props.onClose}
							ml={3}
							channel={channel}
						/>
					</Flex>
				</Flex>
			</Box>

			{children}
		</Column>
	)
}
