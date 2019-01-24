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
	slug: 'execute',
	type: 'type',
	version: '1.0.0',
	name: 'The card execute event',
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
						originator: {
							type: 'string',
							format: 'uuid'
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
							type: 'object',
							required: [
								'action',
								'card',
								'timestamp',
								'error',
								'data'
							],
							properties: {
								action: {
									type: 'string'
								},
								card: {
									type: 'string'
								},
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
										'array',
										'null'
									]
								}
							}
						}
					},
					required: [
						'timestamp',
						'target',
						'actor',
						'payload'
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
