/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Chart from './Chart'

const lens = {
	slug: 'lens-chart',
	type: 'lens',
	version: '1.0.0',
	name: 'Generic chart lens',
	data: {
		icon: 'chart-bar',
		format: 'list',
		renderer: Chart,
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					}
				}
			}
		},
		queryOptions: {
			mask: (query) => {
				Reflect.deleteProperty(query, '$$links')

				return query
			},
			limit: 1000,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}

export default lens
