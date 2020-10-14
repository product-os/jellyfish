/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'thread',
		type: 'type@1.0.0',
		name: 'Chat thread',
		data: {
			schema: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							description: {
								type: 'string',
								fullTextSearch: true
							}
						}
					}
				}
			}
		}
	})
}
