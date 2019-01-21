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
	slug: 'view',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish view',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			description: 'Jellyfish View',
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						actor: {
							type: 'string',
							format: 'uuid'
						},
						anyOf: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										pattern: '^.*\\S.*$'
									},
									schema: {
										type: 'object',
										properties: {
											type: {
												type: 'string',
												const: 'object'
											}
										},
										required: [
											'type'
										]
									}
								},
								additionalProperties: false,
								required: [
									'name',
									'schema'
								]
							}
						},
						allOf: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										pattern: '^.*\\S.*$'
									},
									schema: {
										type: 'object',
										properties: {
											type: {
												type: 'string',
												const: 'object'
											}
										},
										required: [
											'type'
										]
									}
								},
								additionalProperties: false,
								required: [
									'name',
									'schema'
								]
							}
						},
						types: {
							description: 'A list of data types this view can return',
							type: 'array',
							items: {
								type: 'string'
							}
						},
						lenses: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					}
				}
			},
			required: [
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
