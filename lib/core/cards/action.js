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
	slug: 'action',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish action',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					pattern: '^action-[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'action'
				},
				data: {
					type: 'object',
					properties: {
						extends: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						},
						filter: {
							type: 'object'
						},
						arguments: {
							type: 'object',
							patternProperties: {
								'^[a-z0-9]+$': {
									type: 'object'
								}
							}
						}
					},
					required: [
						'arguments'
					]
				}
			},
			additionalProperties: true,
			required: [
				'slug',
				'type',
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
