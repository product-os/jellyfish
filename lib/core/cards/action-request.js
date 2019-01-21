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
						action: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						},
						actor: {
							type: 'string',
							format: 'uuid'
						},
						target: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						},
						timestamp: {
							type: 'string',
							format: 'date-time'
						},
						executed: {
							type: 'boolean',
							dependencies: {
								result: {
									const: true
								}
							}
						},
						result: {
							type: 'object',
							properties: {
								timestamp: {
									type: 'string',
									format: 'date-time'
								},
								error: {
									type: 'boolean'
								},
								data: {
									type: [
										'object',
										'string',
										'number',
										'boolean',
										'array'
									]
								}
							},
							required: [
								'timestamp',
								'error',
								'data'
							]
						},
						arguments: {
							type: 'object'
						}
					},
					required: [
						'action',
						'actor',
						'target',
						'timestamp',
						'executed',
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
