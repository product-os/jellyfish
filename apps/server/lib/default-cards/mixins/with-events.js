/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin defines all common fields in cards that support
// attached events (i.e. 'timelines')
module.exports = ({
	uiSchemaDef
}) => {
	return {
		data: {
			schema: {
				properties: {
					tags: {
						type: 'array',
						items: {
							type: 'string'
						},
						$$formula: 'AGGREGATE($events, \'tags\')',
						fullTextSearch: true
					},
					data: {
						properties: {
							participants: {
								type: 'array',
								$$formula: 'AGGREGATE($events, \'data.actor\')'
							},
							mentionsUser: {
								type: 'array',
								$$formula: 'AGGREGATE($events, \'data.payload.mentionsUser\')'
							},
							alertsUser: {
								type: 'array',
								$$formula: 'AGGREGATE($events, \'data.payload.alertsUser\')'
							},
							mentionsGroup: {
								type: 'array',
								$$formula: 'AGGREGATE($events, \'data.payload.mentionsGroup\')'
							},
							alertsGroup: {
								type: 'array',
								$$formula: 'AGGREGATE($events, \'data.payload.alertsGroup\')'
							}
						}
					}
				}
			},
			uiSchema: {
				fields: {
					tags: {
						$ref: uiSchemaDef('badgeList')
					},
					data: {
						'ui:order': [
							'mentionsUser',
							'alertsUser',
							'mentionsGroup',
							'alertsGroup',
							'participants'
						],
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
						participants: {
							$ref: uiSchemaDef('idOrSlugList')
						}
					}
				}
			}
		}
	}
}
