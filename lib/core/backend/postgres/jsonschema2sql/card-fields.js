/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// Columns of the `cards` table
// TODO: probably worth taking this as an argument and remove the implicit
// assumptions on the table structure from the `SqlQuery` class
module.exports = {
	id: {
		type: 'string'
	},
	version: {
		type: 'string'
	},
	slug: {
		type: 'string'
	},
	type: {
		type: 'string'
	},
	tags: {
		type: 'array',
		items: 'string'
	},
	markers: {
		type: 'array',
		items: 'string'
	},
	name: {
		nullable: true,
		type: 'string'
	},
	links: {
		type: 'object'
	},
	created_at: {
		type: 'string'
	},
	updated_at: {
		type: 'string'
	},
	active: {
		type: 'boolean'
	},
	requires: {
		type: 'array',
		items: 'object'
	},
	capabilities: {
		type: 'array',
		items: 'object'
	},
	data: {
		type: 'object'
	},
	linked_at: {
		type: 'object'
	}
}
