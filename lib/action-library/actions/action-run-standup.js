/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-run-standup',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Run the daily standup',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		filter: {
			type: 'object'
		},
		arguments: {
			repository: {
				type: 'string'
			},
			users: {
				type: 'array',
				items: {
					type: 'string'
				}
			}
		}
	},
	requires: [],
	capabilities: []
}
