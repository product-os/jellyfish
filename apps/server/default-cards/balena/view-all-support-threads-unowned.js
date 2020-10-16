/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads-unowned',
		name: 'Unowned',
		data: {
			allOf: [
				{
					name: 'Unowned cards',
					schema: {
						type: 'object',
						not: {
							$$links: {
								'is owned by': {
									properties: {
										type: {
											const: 'user@1.0.0'
										}
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
