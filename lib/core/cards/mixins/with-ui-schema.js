/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin defines all common fields in cards that support
// UI Schemas (i.e. type cards)
module.exports = {
	data: {
		uiSchema: {
			// Only display the data field for the fields UI schema mode
			fields: {
				name: null,
				slug: null,
				type: null,
				version: null,
				markers: null,
				tags: null,
				links: null,
				active: null,
				requires: null,
				capabilities: null
			},
			snippet: {
				$ref: '#/data/uiSchema/fields',
				name: {},
				links: {}
			}
		}
	}
}
