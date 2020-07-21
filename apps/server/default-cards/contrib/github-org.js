/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'github-org',
		name: 'GitHub Org',
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
						type: 'string'
					},
					data: {
						type: 'object',
						properties: {
							html_url: {
								type: 'string'
							},
							avatar_url: {
								type: 'string'
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		},
		requires: [],
		capabilities: []
	})
}
