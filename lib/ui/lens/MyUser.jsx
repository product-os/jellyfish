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
import Column from '../shame/Column'
import {
	CloseButton
} from '../shame/CloseButton'

class MyUser extends React.Component {
	render () {
		const user = this.props.card

		return (
			<Column>
				<Box
					p={3}
				>
					<Flex justify="space-between">
						<Heading.h2>{user.slug.replace('user-', '')}</Heading.h2>

						<Flex align="center">
							<CloseButton
								mr={-3}
								onClick={() => {
									return this.props.actions.removeChannel(this.props.channel)
								}}
							/>
						</Flex>
					</Flex>
				</Box>
			</Column>
		)
	}
}

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		renderer: MyUser,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user'
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug'
					}
				}
			}
		}
	}
}
