/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin defines all common fields in cards that support
// attached events (i.e. 'timelines')
module.exports = {
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
						}
					}
				}
			}
		}
	}
}
