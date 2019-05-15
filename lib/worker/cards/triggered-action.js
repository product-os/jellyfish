/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
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
						mode: {
							type: 'string',
							enum: [ 'insert', 'update' ]
						},
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
