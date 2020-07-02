/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'support-issue',
		type: 'type@1.0.0',
		version: '1.0.0',
		name: 'Support Issue',
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
							severity: {
								title: 'Severity',
								default: 'low',
								enum: [
									'high',
									'medium',
									'low'
								]
							},
							fixedInOSVersion: {
								title: 'Fixed in OS version',
								description: 'The OS version that this issue was fixed in (if applicable)',
								type: 'string'
							},
							fixedInSupervisorVersion: {
								title: 'Fixed in supervisor version',
								description: 'The supervisor version that this issue was fixed in (if applicable)',
								type: 'string'
							},
							affectedOSVersions: {
								title: 'Affected OS versions',
								type: 'array',
								items: {
									type: 'string'
								}
							},
							affectedSupervisorVersions: {
								title: 'Affected supervisor versions',
								type: 'array',
								items: {
									type: 'string'
								}
							},
							category: {
								title: 'Category',
								type: 'string',
								fullTextSearch: true
							},
							shareable: {
								title: 'Shareable',
								description: 'Can this information be made publicly available?',
								type: 'boolean'
							},
							Problem: {
								type: 'string',
								format: 'markdown',
								fullTextSearch: true
							},
							Solution: {
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
			},
			fieldOrder: [
				'name',
				'tags',
				'severity',
				'shareable',
				'problem',
				'solution'
			]
		},
		requires: [],
		capabilities: []
	})
}
