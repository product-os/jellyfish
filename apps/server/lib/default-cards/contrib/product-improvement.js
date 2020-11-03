/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const fs = require('fs')
const path = require('path')
const DEFAULT_CONTENT = fs.readFileSync(path.join(__dirname, 'product-improvement-default.md'), 'utf-8')

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'product-improvement',
		name: 'Product improvement',
		type: 'type@1.0.0',
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
								format: 'markdown',
								default: DEFAULT_CONTENT
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
			uiSchema: {
				'ui:order': [ 'phase', 'specification', 'description' ]
			},
			meta: {
				relationships: [
					{
						title: 'Discussion topics',
						link: 'is attached to',
						type: 'brainstorm-topic'
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
					},
					{
						title: 'Milestones',
						link: 'has attached',
						type: 'milestone'
					}
				]
			}
		}
	})
}
