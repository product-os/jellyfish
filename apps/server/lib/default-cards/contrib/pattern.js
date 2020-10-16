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
		type: 'type@1.0.0',
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
			},
			meta: {
				relationships: [
					{
						title: 'Product improvements',
						link: 'has attached',
						type: 'product-improvement'
					}
				]
			}
		}
	})
}
