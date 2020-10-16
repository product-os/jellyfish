/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads-my-pending-threads',
		name: 'My pending threads',
		data: {
			allOf: [
				{
					name: 'Cards owned by me that are pending',
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
										const: true
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
