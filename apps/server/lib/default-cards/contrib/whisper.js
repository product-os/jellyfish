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
		slug: 'whisper',
		type: 'type@1.0.0',
		name: 'Whisper message',
		markers: [],
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time',
								fullTextSearch: true
							},
							target: {
								type: 'string',
								format: 'uuid'
							},
							actor: {
								type: 'string',
								format: 'uuid'
							},
							payload: {
								type: 'object',
								required: [ 'message' ],
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
									file: {
										type: 'object',
										properties: {
											name: {
												type: 'string',
												fullTextSearch: true
											},
											mime: {
												type: 'string'
											},
											bytesize: {
												type: 'number'
											},
											slug: {
												type: 'string'
											}
										}
									},
									message: {
										type: 'string',
										format: 'markdown',
										fullTextSearch: true
									}
								}
							},
							edited_at: {
								type: 'string',
								format: 'date-time'
							},
							readBy: {
								description: 'Users that have seen this message',
								type: 'array',
								items: {
									type: 'string'
								}
							}
						},
						required: [
							'timestamp',
							'target',
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
			]
		}
	}
}
