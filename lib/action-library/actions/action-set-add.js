/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-set-add',
	type: 'action',
	version: '1.0.0',
	name: 'Add an element to a set',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		filter: {
			type: 'object'
		},
		arguments: {
			property: {
				type: 'string'
			},
			value: {
				type: [
					'string',
					'number',
					'array'
				]
			}
		}
	},
	requires: [],
	capabilities: []
}
