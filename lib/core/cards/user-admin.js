/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'user-admin',
	type: 'user',
	version: '1.0.0',
	name: 'The admin user',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		disallowLogin: true,
		email: 'accounts+jellyfish@resin.io',
		roles: []
	},
	requires: [],
	capabilities: []
}
