/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'product-improvement',
		name: 'Product improvement',
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
						pattern: '^.*\\S.*$'
					},
					data: {
						type: 'object',
						properties: {
							description: {
								type: 'string',
								format: 'markdown'
							},
							status: {
								title: 'Status',
								type: 'string',
								default: 'open',
								enum: [
									'open',
									'closed'
								]
							}
						},
						required: [
							'status'
						]
					}
				},
				required: [
					'name',
					'data'
				]
			},
			slices: [
				'properties.data.properties.status'
			],
			meta: {
				relationships: [
					{
						title: 'Discussion topics',
						link: 'is attached to',
						type: 'discussion-topic'
					},
					{
						title: 'Support threads',
						link: 'has attached',
						type: 'support-thread'
					}
				]
			}
		},
		requires: [],
		capabilities: []
	})
}
