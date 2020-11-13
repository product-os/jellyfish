/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents, asPipelineItem
}) => {
	return mixin(withEvents, asPipelineItem)({
		slug: 'brainstorm-topic',
		name: 'Brainstorm Topic',
		type: 'type@1.0.0',
		markers: [],
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
				}
			},
			required: [
				'name',
				'data'
			],
			meta: {
				relationships: [ {
					title: 'Issues',
					link: 'has attached',
					type: 'issue'
				}, {
					title: 'Product improvement',
					link: 'has attached',
					type: 'product-improvement'
				}, {
					title: 'Specification',
					link: 'is source for',
					type: 'specification'
				}, {
					title: 'Brainstorm call',
					link: 'is attached to',
					type: 'brainstorm-call'
				} ]
			}
		}
	})
}
