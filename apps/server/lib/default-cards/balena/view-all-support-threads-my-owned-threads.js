/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads-my-owned-threads',
		name: 'My owned threads',
		data: {
			allOf: [
				{
					name: 'Cards owned by me that are not pending',
					schema: {
						type: 'object',
						$$links: {
							'is owned by': {
								type: 'object',
								properties: {
									type: {
										const: 'user@1.0.0'
									},
									id: {
										const: {
											$eval: 'user.id'
										}
									}
								}
							}
						},
						required: [ 'data' ],
						properties: {
							data: {
								type: 'object',
								required: [ 'isPending' ],
								properties: {
									isPending: {
										const: false
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
