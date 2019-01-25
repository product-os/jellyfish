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
	slug: 'action-request',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish Action Request',
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
					pattern: '^action-request-[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'action-request'
				},
				data: {
					type: 'object',
					properties: {
						epoch: {
							type: 'number'
						},
						timestamp: {
							type: 'string',
							format: 'date-time'
						},
						context: {
							type: 'object'
						},
						originator: {
							type: 'string',
							format: 'uuid'
						},
						actor: {
							type: 'string',
							format: 'uuid'
						},
						action: {
							type: 'string'
						},
						input: {
							type: 'object',
							required: [ 'id', 'type' ],
							properties: {
								id: {
									type: 'string',
									format: 'uuid'
								},
								type: {
									type: 'string'
								}
							}
						},
						arguments: {
							type: 'object'
						}
					},
					required: [
						'epoch',
						'timestamp',
						'context',
						'actor',
						'action',
						'input',
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
