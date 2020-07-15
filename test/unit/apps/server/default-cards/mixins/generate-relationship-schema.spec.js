/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const generateRelationshipSchema = require('../../../../../../apps/server/default-cards/mixins/generate-relationship-schema')

ava('`generateRelationshipSchema` generates a top-level oneOf schema', (test) => {
	const card = generateRelationshipSchema({
		data: {
			type_pairs: [
				[ 'time-machine', 'driver' ]
			],
			forward: 'is driven by',
			reverse: 'drives'
		}
	})

	test.is(card.data.schema.type, 'object')
	test.deepEqual(card.data.schema.required, [ 'name', 'data' ])
	test.assert(Array.isArray(card.data.schema.oneOf))
})

ava('`generateRelationshipSchema` generates forward and reverse schema branches', (test) => {
	const card = generateRelationshipSchema({
		data: {
			type_pairs: [
				[ 'time-machine', 'driver' ]
			],
			forward: 'is driven by',
			reverse: 'drives'
		}
	})

	test.assert(card.data.schema.oneOf.length === 2)
	const [ forward, reverse ] = card.data.schema.oneOf

	test.deepEqual(forward, {
		properties: {
			name: {
				const: 'is driven by'
			},
			data: {
				type: 'object',
				required: [ 'from', 'to', 'inverseName' ],
				properties: {
					from: {
						type: 'object',
						required: [ 'type', 'id' ],
						properties: {
							id: {
								type: 'string',
								format: 'uuid'
							},
							type: {
								type: 'string',
								pattern: '^time-machine@'
							}
						}
					},
					to: {
						type: 'object',
						required: [ 'type', 'id' ],
						properties: {
							id: {
								type: 'string',
								format: 'uuid'
							},
							type: {
								type: 'string',
								pattern: '^driver@'
							}
						}
					},
					inverseName: {
						const: 'drives'
					}
				}
			}
		}
	})

	test.deepEqual(reverse, {
		properties: {
			name: {
				const: 'drives'
			},
			data: {
				type: 'object',
				required: [ 'from', 'to', 'inverseName' ],
				properties: {
					from: {
						type: 'object',
						required: [ 'type', 'id' ],
						properties: {
							id: {
								type: 'string',
								format: 'uuid'
							},
							type: {
								type: 'string',
								pattern: '^driver@'
							}
						}
					},
					to: {
						type: 'object',
						required: [ 'type', 'id' ],
						properties: {
							id: {
								type: 'string',
								format: 'uuid'
							},
							type: {
								type: 'string',
								pattern: '^time-machine@'
							}
						}
					},
					inverseName: {
						const: 'is driven by'
					}
				}
			}
		}
	})
})

ava('`generateRelationshipSchema` generates schema branches for all type pairs', (test) => {
	const card = generateRelationshipSchema({
		data: {
			type_pairs: [
				[ 'time-machine', 'driver' ],
				[ 'steam-train', 'driver' ]
			],
			forward: 'is driven by',
			reverse: 'drives'
		}
	})

	test.assert(card.data.schema.oneOf.length === 4)
})

ava('`generateRelationshipSchema` correctly extracts type names from types with aliases', (test) => {
	const card = generateRelationshipSchema({
		data: {
			type_pairs: [
				[
					'time-machine',
					{
						name: 'user',
						title: 'Driver'
					}
				]
			],
			forward: 'is driven by',
			reverse: 'drives'
		}
	})

	test.is(card.data.schema.oneOf[0].properties.data.properties.from.properties.type.pattern, '^time-machine@')
	test.is(card.data.schema.oneOf[0].properties.data.properties.to.properties.type.pattern, '^user@')
})
