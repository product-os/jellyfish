/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import ViewLink from '../ViewLink'

const view = {
	id: 'ffc200db-0f81-4ce3-a280-01515f94869f',
	slug: 'view-all-messages',
	type: 'view',
	active: true,
	version: '1.0.0',
	name: 'All messages',
	tags: [],
	markers: [
		'org-balena'
	],
	created_at: '2018-10-15T18:56:07.628Z',
	links: {},
	requires: [],
	capabilities: [],
	data: {
		allOf: [
			{
				name: 'Active cards',
				schema: {
					type: 'object',
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
					properties: {
						type: {
							const: 'message'
						},
						active: {
							type: 'boolean',
							const: true
						}
					},
					additionalProperties: true
				}
			}
		],
		lenses: [
			'lens-interleaved'
		]
	},
	updated_at: '2019-05-17T14:21:12.292Z',
	linked_at: null
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<ViewLink
				card={view}
			/>
		)
	})
})
