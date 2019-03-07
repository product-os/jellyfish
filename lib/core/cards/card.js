/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const schemas = require('@jellyfish/schemas')

module.exports = {
	slug: 'card',
	name: 'Jellyfish Card',
	version: '1.0.0',
	markers: [],
	type: 'type',
	tags: [],
	links: {},
	active: true,
	data: {
		schema: schemas.cardSchema()
	},
	requires: [],
	capabilities: []
}
