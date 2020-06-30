/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'os-test-result',
		name: 'OS test result',
		version: '1.0.0',
		type: 'type@1.0.0',
		markers: [ 'org-balena' ],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						pattern: '^.*\\S.*$'
					},
					data: {
						type: 'object',
						properties: {
							provision_time: {
								type: 'string'
							},
							image_size: {
								type: 'string'
							},
							resin_os_version: {
								type: 'string'
							},
							body: {
								type: 'string',
								format: 'markdown'
							},
							author: {
								anyOf: [
									{
										type: 'string'
									},
									{
										type: 'null'
									}
								]
							},
							timestamp: {
								type: 'string',
								format: 'date-time'
							}
						}
					}
				},
				required: [
					'data'
				]
			},
			slices: [
				'properties.data.properties.status'
			]
		},
		requires: [],
		capabilities: []
	})
}
