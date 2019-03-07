/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const schemas = require('@jellyfish/schemas')

module.exports = {
	slug: 'action-create-event',
	type: 'action',
	version: '1.0.0',
	name: 'Attach an event to a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: Object.assign(
			schemas.cardSchemaProperties([ 'slug', 'tags', 'type' ]),
			{
				payload: {
					type: 'object'
				}
			}
		),
		required: [ 'type', 'payload' ]
	},
	requires: [],
	capabilities: []
}
