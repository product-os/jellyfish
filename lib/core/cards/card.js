/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
	slug: 'card',
	name: 'Jellyfish Card',
	version: '1.0.0',
	markers: [],
	type: 'type',
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					format: 'uuid'
				},
				version: {
					type: 'string',
					pattern: '^\\d+\\.\\d+\\.\\d+$'
				},
				slug: {
					type: 'string',
					pattern: '^[a-z0-9-]+$'
				},
				name: {
					type: 'string'
				},
				type: {
					type: 'string',
					pattern: '^[a-z0-9-]+$'
				},
				tags: {
					type: 'array',
					items: {
						type: 'string'
					}
				},
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				},
				links: {
					type: 'object'
				},
				created_at: {
					type: 'string',
					format: 'date-time'
				},
				active: {
					type: 'boolean'
				},
				requires: {
					type: 'array',
					items: {
						type: 'object'
					}
				},
				capabilities: {
					type: 'array',
					items: {
						type: 'object'
					}
				},
				data: {
					type: 'object',
					additionalProperties: true
				}
			},
			additionalProperties: false,
			required: [
				'active',
				'created_at',
				'slug',
				'capabilities',
				'data',
				'links',
				'markers',
				'requires',
				'tags',
				'type',
				'version'
			]
		}
	},
	requires: [],
	capabilities: []
}
