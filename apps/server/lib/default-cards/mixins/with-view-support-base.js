/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin defines all common fields in support threads view cards
module.exports = {
	type: 'view@1.0.0',
	markers: [ 'org-balena' ],
	data: {
		namespace: 'Support',
		allOf: [
			{
				name: 'Active support-thread cards',
				schema: {
					$$links: {
						'has attached element': {
							type: 'object',
							properties: {
								type: {
									enum: [
										'message@1.0.0',
										'create@1.0.0',
										'whisper@1.0.0',
										'update@1.0.0'
									]
								}
							},
							additionalProperties: true
						}
					},
					type: 'object',
					properties: {
						active: {
							const: true,
							type: 'boolean'
						},
						type: {
							type: 'string',
							const: 'support-thread@1.0.0'
						}
					},
					required: [
						'active',
						'type'
					],
					additionalProperties: true
				}
			}
		],
		lenses: [
			'lens-support-threads',
			'lens-table',
			'lens-kanban'
		]
	}
}
