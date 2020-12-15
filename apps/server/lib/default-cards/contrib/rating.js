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
		slug: 'rating',
		type: 'type@1.0.0',
		name: 'Rating',
		markers: [],
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						title: 'Version',
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							timestamp: {
								title: 'Timestamp',
								type: 'string',
								format: 'date-time',
								fullTextSearch: true
							},
							actor: {
								title: 'Actor',
								type: 'string',
								format: 'uuid'
							},
							payload: {
								type: 'object',
								properties: {
									mentionsUser: {
										type: 'array',
										items: {
											type: 'string'
										}
									},
									alertsUser: {
										type: 'array',
										items: {
											type: 'string'
										}
									},
									mentionsGroup: {
										type: 'array',
										items: {
											type: 'string'
										}
									},
									alertsGroup: {
										type: 'array',
										items: {
											type: 'string'
										}
									},
									message: {
										title: 'Message',
										type: 'string',
										$$formula:
											// eslint-disable-next-line max-len
											'(this.data.payload.score ? "Review score: " + this.data.payload.score + "/5" : "") +' +
											// eslint-disable-next-line max-len
											'(this.data.payload.comment ? "\\n\\nReview comment:\\n" + this.data.payload.comment : "")',
										readOnly: true
									},
									comment: {
										title: 'Comment',
										type: 'string',
										format: 'markdown',
										fullTextSearch: true
									},
									score: {
										title: 'Score',
										type: 'number'
									}
								}
							},
							edited_at: {
								title: 'Edited at',
								type: 'string',
								format: 'date-time'
							},
							readBy: {
								title: 'Users that have seen this rating',
								type: 'array',
								items: {
									type: 'string'
								}
							}
						},
						required: [
							'timestamp',
							'actor',
							'payload'
						]
					}
				}
			},
			uiSchema: {
				fields: {
					data: {
						actor: {
							$ref: uiSchemaDef('idOrSlugLink')
						},
						target: {
							$ref: uiSchemaDef('idOrSlugLink')
						},
						mirrors: {
							$ref: uiSchemaDef('mirrors')
						},
						timestamp: {
							$ref: uiSchemaDef('dateTime')
						},
						edited_at: {
							$ref: uiSchemaDef('dateTime')
						},
						readBy: {
							$ref: uiSchemaDef('usernameList')
						},
						payload: {
							'ui:title': null,
							mentionsUser: {
								$ref: uiSchemaDef('usernameList')
							},
							alertsUser: {
								$ref: uiSchemaDef('usernameList')
							},
							mentionsGroup: {
								$ref: uiSchemaDef('groupList')
							},
							alertsGroup: {
								$ref: uiSchemaDef('groupList')
							},
							comment: {
								'ui:widget': 'textarea',
								'ui:options': {
									rows: 2
								}
							}
						}
					}
				},
				edit: {
					$ref: '#/data/uiSchema/definitions/form'
				},
				create: {
					$ref: '#/data/uiSchema/edit'
				},
				definitions: {
					form: {
						data: {
							payload: {
								score: {
									'ui:widget': 'Rating'
								}
							}
						}
					}
				}
			},
			lenses: [
				'lens-interleaved'
			],
			indexed_fields: [
				[ 'data.readBy' ],
				[ 'data.payload.mentionsUser' ],
				[ 'data.payload.alertsUser' ],
				[ 'data.payload.mentionsGroup' ],
				[ 'data.payload.alertsGroup' ]
			],
			meta: {
				relationships: [
					{
						title: 'Support threads',
						link: 'is attached to',
						type: 'support-thread'
					},
					{
						title: 'Owner',
						link: 'is owned by',
						type: 'user'
					}
				]
			}
		}
	}
}
