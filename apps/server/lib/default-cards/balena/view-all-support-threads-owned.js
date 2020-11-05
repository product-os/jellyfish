/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads-owned',
		name: 'Owned',
		data: {
			allOf: [
				{
					name: 'Owned cards',
					schema: {
						type: 'object',
						$$links: {
							'is owned by': {
								type: 'object',
								properties: {
									type: {
										const: 'user@1.0.0'
									}
								}
							}
						},
						additionalProperties: true
					}
				}
			]
		}
	})
}
