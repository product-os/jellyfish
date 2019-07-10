/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Flex
} from 'rendition'
import Link from '../../../components/Link'

export default class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card
		} = this.props

		return (
			<Box pb={3}>
				<Flex>
					<Box flex="1" mr={3}>
						<Link append={card.slug || card.id}>
							<strong>{card.name || card.slug}</strong>
						</Link>
					</Box>
					<Box flex="1">
						{_.get(card, [ 'data', 'profile', 'email' ])}
					</Box>
				</Flex>
			</Box>
		)
	}
}
