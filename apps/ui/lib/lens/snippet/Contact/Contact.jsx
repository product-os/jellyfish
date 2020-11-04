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
import Link from '@balena/jellyfish-ui-components/lib/Link'

export default class SingleCard extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card
		} = this.props

		const first = _.get(card, [ 'data', 'profile', 'name', 'first' ])
		const last = _.get(card, [ 'data', 'profile', 'name', 'last' ])

		const fullName = (first && last) ? `${first} ${last}` : null

		return (
			<Box p={3}>
				<Flex>
					<Box flex="1" mr={3}>
						<Link append={card.slug || card.id}>
							<strong>{fullName || card.name || card.slug}</strong>
						</Link>
					</Box>
					<Box flex="1" mr={3}>
						<em>{_.get(card, [ 'data', 'profile', 'type' ])}</em>
					</Box>
					<Box flex="1" mr={3}>
						<em>{_.get(card, [ 'data', 'profile', 'company' ])}</em>
					</Box>
					<Box flex="1">
						{_.get(card, [ 'data', 'profile', 'email' ])}
					</Box>
				</Flex>
			</Box>
		)
	}
}
