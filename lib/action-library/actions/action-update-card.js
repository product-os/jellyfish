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
	slug: 'action-update-card',
	type: 'action',
	version: '1.0.0',
	name: 'Update properties of a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			properties: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
						pattern: '^[a-z0-9-]+$'
					},
					version: {
						type: 'string',
						pattern: '^\\d+\\.\\d+\\.\\d+$'
					},
					active: {
						type: 'boolean'
					},
					created_at: {
						type: 'string',
						format: 'date-time'
					},
					name: {
						type: 'string',
						pattern: '^.*\\S.*$'
					},
					markers: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^[a-zA-Z0-9-_/:+]+$'
						}
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						}
					},
					links: {
						type: 'object'
					},
					data: {
						type: 'object'
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
					}
				},
				additionalProperties: false,
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
