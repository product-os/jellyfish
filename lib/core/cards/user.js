/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'user',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish User',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				},
				slug: {
					type: 'string',
					pattern: '^user-[a-z0-9-]+$'
				},
				data: {
					type: 'object',
					properties: {
						email: {
							type: 'string',
							format: 'email'
						},
						hash: {
							type: 'string'
						},
						avatar: {
							type: [
								'string',
								'null'
							]
						},
						roles: {
							type: 'array',
							items: {
								type: 'string',
								pattern: '^[a-z0-9-]+$',
								not: {
									const: 'user-admin'
								}
							}
						},
						oauth: {
							description: 'Linked accounts',
							type: 'object'
						},
						profile: {
							description: 'Configuration options for your account',
							type: 'object',
							properties: {
								company: {
									type: 'string'
								},
								title: {
									type: 'string'
								},
								country: {
									type: 'string'
								},
								city: {
									type: 'string'
								},
								name: {
									type: 'object',
									properties: {
										first: {
											type: 'string'
										},
										last: {
											type: 'string'
										}
									}
								},
								homeView: {
									description: 'The default view that is loaded after you login',
									type: 'string',
									format: 'uuid'
								},
								sendCommand: {
									type: 'string',
									default: 'shift+enter',
									enum: [
										'shift+enter',
										'ctrl+enter',
										'enter'
									]
								},
								viewSettings: {
									description: 'A map of settings for view cards, keyed by the view id',
									type: 'object',
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
														title: 'Web',
														description: 'Alert me with desktop notifications',
														type: 'object',
														properties: {
															update: {
																type: 'boolean'
															},
															mention: {
																type: 'boolean'
															},
															alert: {
																type: 'boolean'
															}
														},
														additionalProperties: false
													}
												}
											}
										}
									}
								}
							}
						}
					},
					required: [
						'roles'
					]
				}
			},
			required: [
				'slug',
				'data'
			]
		},
		meta: {
			relationships: [
				{
					title: 'Contact',
					link: 'has attached contact',
					type: 'contact'
				},
				{
					title: 'Sales',
					query: [
						{
							$$links: {
								'has attached element': {
									type: 'object',
									properties: {
										type: {
											const: 'create'
										},
										data: {
											type: 'object',
											properties: {
												actor: {
													const: {
														$eval: 'result.id'
													}
												}
											},
											required: [
												'actor'
											]
										}
									},
									required: [
										'data'
									]
								}
							},
							type: 'object',
							properties: {
								type: {
									const: 'sales-thread'
								}
							},
							additionalProperties: true
						}
					]
				},
				{
					title: 'Support',
					query: [
						{
							$$links: {
								'has attached element': {
									type: 'object',
									properties: {
										type: {
											const: 'create'
										},
										data: {
											type: 'object',
											properties: {
												actor: {
													const: {
														$eval: 'result.id'
													}
												}
											},
											required: [
												'actor'
											]
										}
									},
									required: [
										'data'
									]
								}
							},
							type: 'object',
							properties: {
								type: {
									const: 'support-thread'
								}
							},
							additionalProperties: true
						}
					]
				}
			]
		}
	},
	requires: [],
	capabilities: []
}
