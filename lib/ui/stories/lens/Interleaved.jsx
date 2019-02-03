/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as React from 'react'
import {
	storiesOf
} from '@storybook/react'
import {
	Fixed
} from 'rendition'
import {
	Interleaved
} from '../../lens/Interleaved'

const channel = {
	id: '62c27f17-2497-4c63-a53c-1a273353de7f',
	created_at: '2019-01-10T16:38:31.853Z',
	slug: 'channel-62c27f17-2497-4c63-a53c-1a273353de7f',
	type: 'channel',
	version: '1.0.0',
	tags: [],
	markers: [],
	links: {},
	requires: [],
	capabilities: [],
	active: true,
	data: {
		target: '46fd2fc9-cfd9-4f2c-ba65-640a4effe8a5',
		cardType: 'view',
		head: {
			active: true,
			version: '1.0.0',
			tags: [],
			markers: [
				'org-balena'
			],
			links: {
				'has attached element': [
					{
						id: '52f0bd0c-9efd-4ddd-b4f7-7ddc5078f9dc',
						slug: 'create-52f0bd0c-9efd-4ddd-b4f7-7ddc5078f9dc',
						type: 'create'
					}
				]
			},
			requires: [],
			capabilities: [],
			data: {
				allOf: [
					{
						name: 'Active cards',
						schema: {
							type: 'object',
							properties: {
								active: {
									const: true,
									type: 'boolean'
								},
								type: {
									const: 'message'
								}
							},
							markers: {
								type: 'array',
								contains: {
									const: 'org-balena'
								}
							},
							required: [
								'active',
								'type'
							],
							additionalProperties: true
						}
					}
				],
				lenses: [
					'lens-interleaved'
				]
			},
			slug: 'view-all-messages',
			name: 'All messages',
			type: 'view',
			created_at: '2018-10-15T18:56:07.628Z',
			id: '46fd2fc9-cfd9-4f2c-ba65-640a4effe8a5'
		},
		parentChannel: '1f7c5e6a-0702-4691-95ac-8d37045fb4e5'
	}
}

storiesOf('Lens/Interleaved', module)
	.add('Standard', () => {
		return (
			<Fixed top right bottom left>
				<Interleaved
					channel={channel}
					tail={[]}
				/>
			</Fixed>
		)
	})
