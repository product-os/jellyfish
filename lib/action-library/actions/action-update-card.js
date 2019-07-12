/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-update-card',
	type: 'action',
	version: '1.0.0',
	name: 'Update properties of a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			reason: {
				type: [ 'null', 'string' ]
			},
			patch: {
				type: 'array'
			}
		}
	},
	requires: [],
	capabilities: []
}
