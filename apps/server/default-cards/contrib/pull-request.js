/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'pull-request',
		name: 'Pull Request',
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
								type: 'string',
								enum: [
									'open',
									'closed'
								]
							},
							archived: {
								type: 'boolean',
								default: false
							},
							head: {
								type: 'object',
								properties: {
									branch: {
										type: 'string'
									},
									sha: {
										type: 'string',
										pattern: '[0-9a-f]{5,40}'
									}
								},
								required: [
									'branch',
									'sha'
								]
							},
							base: {
								type: 'object',
								properties: {
									branch: {
										type: 'string'
									},
									sha: {
										type: 'string',
										pattern: '^[a-f0-9]{7,40}$'
									}
								},
								required: [
									'branch',
									'sha'
								]
							},
							created_at: {
								type: [ 'string', 'null' ]
							},
							merged_at: {
								type: [ 'string', 'null' ]
							},
							repository: {
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
