/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'org',
	type: 'type',
	version: '1.0.0',
	name: 'Organisation',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				tags: {
					type: 'array',
					items: {
						type: 'string'
					},
					$$formula: 'AGGREGATE($events, \'tags\')'
				},
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				},
				name: {
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						profile: {
							type: 'object',
							properties: {
								status: {
									default: 'Nominal',
									enum: [
										'Nominal',
										'Potential',
										'Possible',
										'Probable',
										'Closed Won',
										'Needs Attention',
										'Awaiting Response',
										'Overages / Upgrades - Awaiting Resolution',
										'Closed Lost',
										'Closed Churned',
										'Ghosted'
									]
								},
								industry: {
									title: 'Industry',
									type: 'string'
								},
								usecase: {
									title: 'Use case(s)',
									type: 'string'
								},
								stack: {
									title: 'Tech stack',
									type: 'string'
								},
								location: {
									title: 'Location',
									type: 'string'
								},
								stageOfBusiness: {
									title: 'Stage of business',
									type: 'string'
								},
								projectedArr: {
									title: 'Projected ARR',
									type: 'number'
								},
								description: {
									type: 'string',
									format: 'markdown'
								}
							}
						}
					}
				}
			},
			required: [
				'name'
			]
		},
		slices: [
			'properties.data.properties.profile.properties.status'
		]
	},
	requires: [],
	capabilities: []
}
