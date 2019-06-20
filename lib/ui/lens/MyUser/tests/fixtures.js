/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

export const userType = {
	id: '1d69caf6-6694-4cd0-8c9e-0a70e2078ad5',
	slug: 'user',
	type: 'type',
	active: true,
	version: '1.0.0',
	name: 'Jellyfish User',
	tags: [],
	markers: [],
	created_at: '2019-06-19T08:32:33.142Z',
	links: {},
	requires: [],
	capabilities: [],
	data: {
		schema: {
			type: 'object',
			required: [
				'slug',
				'data'
			],
			properties: {
				data: {
					type: 'object',
					required: [
						'email',
						'roles'
					],
					properties: {
						hash: {
							type: 'string'
						},
						email: {
							type: 'string',
							format: 'email'
						},
						oauth: {
							type: 'object',
							description: 'Linked accounts'
						},
						roles: {
							type: 'array',
							items: {
								not: {
									const: 'user-admin'
								},
								type: 'string',
								pattern: '^[a-z0-9-]+$'
							}
						},
						profile: {
							type: 'object',
							properties: {
								city: {
									type: 'string'
								},
								name: {
									type: 'object',
									properties: {
										last: {
											type: 'string'
										},
										first: {
											type: 'string'
										}
									}
								},
								title: {
									type: 'string'
								},
								company: {
									type: 'string'
								},
								country: {
									type: 'string'
								},
								homeView: {
									type: 'string',
									format: 'uuid',
									description: 'The default view that is loaded after you login'
								},
								sendCommand: {
									enum: [
										'shift+enter',
										'ctrl+enter',
										'enter'
									],
									type: 'string',
									default: 'shift+enter'
								},
								viewSettings: {
									type: 'object',
									description: 'A map of settings for view cards, keyed by the view id',
									patternProperties: {
										'^.*$': {
											lens: {
												type: 'string'
											},
											slice: {
												type: 'string'
											},
											notifications: {
												type: 'object',
												properties: {
													web: {
														type: 'object',
														title: 'Web',
														properties: {
															alert: {
																type: 'boolean'
															},
															update: {
																type: 'boolean'
															},
															mention: {
																type: 'boolean'
															}
														},
														description: 'Alert me with desktop notifications',
														additionalProperties: false
													}
												}
											}
										}
									}
								}
							},
							description: 'Configuration options for your account'
						}
					}
				},
				slug: {
					type: 'string',
					pattern: '^user-[a-z0-9-]+$'
				},
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				}
			}
		}
	},
	updated_at: '2019-06-19T08:34:00.208Z',
	linked_at: {}
}

export const user = {
	id: '85a886b5-8b45-473f-a3f6-b5598e3813ea',
	slug: 'user-johndoe',
	type: 'user',
	active: true,
	version: '1.0.0',
	name: null,
	tags: [],
	markers: [],
	created_at: '2019-06-19T08:32:50.951Z',
	links: {},
	requires: [],
	capabilities: [],
	data: {
		hash: '$2b$12$ucmOHBSPbvANMV56fR1wJuipJws1W9pIahf7X3NconLclhjLp2inG',
		email: 'johndoe@example.com',
		roles: [
			'user-community'
		]
	},
	updated_at: null,
	linked_at: {
		'is member of': '2019-06-19T08:32:51.129Z',
		'has attached element': '2019-06-19T08:32:51.057Z'
	}
}
