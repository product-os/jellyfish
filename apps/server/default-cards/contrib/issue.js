/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'issue',
		name: 'GitHub Issue',
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
							repository: {
								type: 'string'
							},
							mirrors: {
								type: 'array',
								items: {
									type: 'string'
								}
							},
							description: {
								type: 'string',
								format: 'markdown'
							},
							status: {
								title: 'Status',
								type: 'string',
								enum: [
									'open',
									'closed'
								]
							},
							archived: {
								type: 'boolean',
								default: false
							}
						},
						required: [
							'repository'
						]
					}
				},
				required: [
					'data'
				]
			},
			slices: [
				'properties.data.properties.status'
			]
		},
		requires: [],
		capabilities: []
	})
}
