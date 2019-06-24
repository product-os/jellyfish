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
import CardActions from '../../components/CardActions'
import {
	CloseButton
} from '../../shame/CloseButton'

export default class Contact extends React.Component {
	render () {
		console.log('props', this.props)
		const {
			card,
			channel
		} = this.props

		return (
			<Box p={3}>
				<Flex justifyContent="space-between">
					<Heading.h4>
						{card.name || card.slug || card.type}
					</Heading.h4>

					<Flex align="baseline">
						<CardActions card={card}/>

						<CloseButton
							ml={3}
							channel={channel}
						/>
					</Flex>
				</Flex>
			</Box>
		)
	}
}
