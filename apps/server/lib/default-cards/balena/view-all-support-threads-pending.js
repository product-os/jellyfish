/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads-pending',
		name: 'Pending',
		data: {
			allOf: [
				{
					name: 'Pending cards',
					schema: {
						type: 'object',
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
						required: [
							'data'
						],
						additionalProperties: true
					}
				}
			]
		}
	})
}
