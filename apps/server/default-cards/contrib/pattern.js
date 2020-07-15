/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'pattern',
		name: 'Pattern',
		version: '1.0.0',
		type: 'type@1.0.0',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						fullTextSearch: true
					},
					data: {
						type: 'object',
						properties: {
							description: {
								type: 'string',
								format: 'markdown',
								fullTextSearch: true
							}
						}
					}
				},
				required: [
					'name'
				]
			}
		},
		requires: [],
		capabilities: []
	})
}
