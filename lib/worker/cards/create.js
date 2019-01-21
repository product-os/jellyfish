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
	slug: 'create',
	type: 'type',
	version: '1.0.0',
	name: 'The card create event',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						timestamp: {
							type: 'string',
							format: 'date-time'
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
							type: 'object'
						}
					},
					required: [
						'timestamp',
						'target',
						'actor'
					]
				}
			},
			additionalProperties: true,
			required: [
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
