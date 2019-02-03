/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'view-read-user-admin',
	name: 'Kernel admin user read permissions',
	version: '1.0.0',
	type: 'view',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		allOf: [
			{
				name: 'All cards',
				schema: {
					type: 'object',
					additionalProperties: true
				}
			}
		]
	},
	requires: [],
	capabilities: []
}
