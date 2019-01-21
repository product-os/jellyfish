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
	slug: 'triggered-action',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish Triggered Action',
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
					pattern: '^triggered-action-[a-z0-9-]+$'
				},
				data: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						},
						startDate: {
							type: 'string',
							format: 'date-time'
						},
						interval: {
							type: 'string',
							pattern: '^P(?!$)(\\d+Y)?(\\d+M)?(\\d+W)?(\\d+D)?(T(?=\\d)(\\d+H)?(\\d+M)?(\\d+S)?)?$'
						},
						filter: {
							type: 'object'
						},
						action: {
							type: 'string'
						},
						target: {
							type: [
								'string',
								'object'
							]
						},
						targetType: {
							type: [
								'string',
								'object'
							]
						},
						arguments: {
							type: 'object'
						}
					},
					oneOf: [
						{
							required: [
								'filter',
								'action',
								'target',
								'arguments'
							]
						},
						{
							required: [
								'interval',
								'action',
								'target',
								'arguments'
							]
						}
					]
				}
			},
			required: [
				'slug',
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
