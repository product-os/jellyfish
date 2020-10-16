/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */

module.exports = ({
	uiSchemaDef
}) => {
	return {
		slug: 'specification',
		name: 'Specification',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						pattern: '^.*\\S.*$'
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						},
						$$formula: 'AGGREGATE($events, \'tags\')'
					},
					data: {
						type: 'object',
						properties: {
							blurb: {
								title: 'Blurb',
								type: 'string',
								format: 'markdown'
							},
							content: {
								title: 'Introduction',
								type: 'string',
								format: 'markdown',
								// eslint-disable-next-line max-len
								default: '# Introduction\n\n# Current State\n\n# Target State\n\n## Bloggable Content\n\nThis spec is ok to publish to the community: (yes/no)\n\n# Benefits\n\n# Implementation Approach\n\n# Potential Issues\n\n# Possible Future Extensions\n\n# Milestones\n\n- [ ] Sample milestone (estimate: X days)\n\n# References\n* Flowdock threads\n* Relevant issues/tickets/specs\n* Relevant Architecture call notes\n* Other references'
							}
						}
					}
				},
				required: [
					'data'
				]
			},
			uiSchema: {
				snippet: {
					$ref: uiSchemaDef('reset'),
					data: {
						blurb: {
							'ui:title': null
						},
						content: null
					}
				}
			},
			meta: {
				relationships: [
					{
						title: 'Discussion topic',
						link: 'comes from',
						type: 'brainstorm-topic'
					},
					{
						title: 'GitHub issue',
						link: 'is source for',
						type: 'issue'
					}
				]
			}
		}
	}
}
