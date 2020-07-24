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
							specification: {
								type: 'string',
								format: 'markdown'
							},
							phase: {
								title: 'Phase',
								type: 'string',
								default: 'proposed',
								oneOf: [
									{
										title: 'Proposed',
										const: 'proposed'
									},
									{
										title: 'Waiting',
										const: 'waiting'
									},
									{
										title: 'Researching (Drafting Spec)',
										const: 'researching'
									},
									{
										title: 'Candidate spec',
										const: 'candidate-spec'
									},
									{
										title: 'Assigned resources',
										const: 'assigned-resources'
									},
									{
										title: 'Implementation',
										const: 'implementation'
									},
									{
										title: 'All milestones completed',
										const: 'all-milestones-completed'
									},
									{
										title: 'Finalising and testing',
										const: 'finalising-and-testing'
									},
									{
										title: 'Merged',
										const: 'merged'
									},
									{
										title: 'Released',
										const: 'released'
									},
									{
										title: 'Denied or Failed',
										const: 'denied-or-failed'
									}
								]
							}
						},
						required: [
							'phase'
						]
					}
				},
				required: [
					'name',
					'data'
				]
			},
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
					},
					{
						title: 'Patterns',
						link: 'is attached to',
						type: 'pattern'
					}
				]
			}
		},
		requires: [],
		capabilities: []
	})
}
