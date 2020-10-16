/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */

module.exports = ({
	uiSchemaDef
}) => {
	return {
		slug: 'contact',
		type: 'type@1.0.0',
		name: 'Contact',
		markers: [],
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
					name: {
						type: [ 'string', 'null' ]
					},
					slug: {
						type: 'string',
						pattern: '^contact-[a-z0-9-]+$'
					},
					data: {
						type: 'object',
						properties: {
							source: {
								type: 'string'
							},
							profile: {
								type: 'object',
								properties: {
									email: {
										anyOf: [
											{
												title: 'string',
												type: 'string',
												format: 'email'
											},
											{
												title: 'array',
												type: 'array',
												uniqueItems: true,
												minItems: 1,
												items: {
													type: 'string',
													format: 'email'
												}
											}
										]
									},
									company: {
										type: 'string'
									},
									title: {
										type: 'string'
									},
									type: {
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
									}
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			},
			uiSchema: {
				fields: {
					data: {
						mirrors: null,
						profile: {
							'ui:title': null,
							email: {
								$ref: uiSchemaDef('email')
							},
							name: {
								'ui:title': null,
								'ui:order': [ 'first', 'last' ],
								first: {
									'ui:title': 'First name'
								},
								last: {
									'ui:title': 'Last name'
								}
							}
						}
					}
				}
			},
			meta: {
				relationships: [
					{
						title: 'Account',
						link: 'is member of',
						type: 'account'
					},
					{
						title: 'Owner',
						link: 'is owned by',
						type: 'user'
					},
					{
						title: 'Backup owners',
						link: 'has backup owner',
						type: 'user'
					},
					{
						title: 'Support',
						query: [
							{
								link: 'is attached to user',
								type: 'user'
							},
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
								}
							}
						]
					}
				]
			}
		}
	}
}
