/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const views = require('../../../lib/core/views')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava('.getSchema() should return null if the card is not a view', (test) => {
	const schema = views.getSchema(CARDS['user-admin'])
	test.deepEqual(schema, null)
})

ava('.getSchema() should preserve template interpolations in user properties', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					foo: {
						type: 'string',
						const: {
							$eval: 'user.slug'
						}
					}
				},
				required: [ 'foo' ]
			}
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				const: {
					$eval: 'user.slug'
				}
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getSchema() should preserve template interpolations in schema properties', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					foo: {
						type: {
							$eval: 'user.type'
						}
					}
				},
				required: [ 'foo' ]
			}
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: {
					$eval: 'user.type'
				}
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getSchema() should return a schema given a view card with two conjunctions', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								minLength: 1
							}
						},
						required: [ 'foo' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								maxLength: 5
							}
						},
						required: [ 'foo' ]
					}
				}
			]
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'string',
				minLength: 1,
				maxLength: 5
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getSchema() should return a schema given a view card with two conjunctions and empty disjunctions', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			anyOf: [],
			allOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								minLength: 1
							}
						},
						required: [ 'foo' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								maxLength: 5
							}
						},
						required: [ 'foo' ]
					}
				}
			]
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'string',
				minLength: 1,
				maxLength: 5
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getSchema() should return a schema given a view card with two disjunctions', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			anyOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'view'
							}
						},
						required: [ 'type' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'action'
							}
						},
						required: [ 'type' ]
					}
				}
			]
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: true,
		anyOf: [
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'view'
					}
				},
				required: [ 'type' ]
			},
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'action'
					}
				},
				required: [ 'type' ]
			}
		]
	})
})

ava('.getSchema() should return a schema given a view card with two disjunctions and empty conjunctions', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			allOf: [],
			anyOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'view'
							}
						},
						required: [ 'type' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'action'
							}
						},
						required: [ 'type' ]
					}
				}
			]
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: true,
		anyOf: [
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'view'
					}
				},
				required: [ 'type' ]
			},
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'action'
					}
				},
				required: [ 'type' ]
			}
		]
	})
})

ava('.getSchema() should return a schema given a view card with two disjunctions and two conjunctions', (test) => {
	const schema = views.getSchema(test.context.kernel.defaults({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {
			anyOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'view@1.0.0'
							}
						},
						required: [ 'type' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'action'
							}
						},
						required: [ 'type' ]
					}
				}
			],
			allOf: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								minLength: 1
							}
						},
						required: [ 'foo' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								maxLength: 5
							}
						},
						required: [ 'foo' ]
					}
				}
			]
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'string',
				minLength: 1,
				maxLength: 5
			}
		},
		required: [ 'foo' ],
		anyOf: [
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'view@1.0.0'
					}
				},
				required: [ 'type' ]
			},
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'action'
					}
				},
				required: [ 'type' ]
			}
		]
	})
})

ava('.getSchema() should return null given a view card with no filters', (test) => {
	const schema = views.getSchema({
		type: 'view@1.0.0',
		version: '1.0.0',
		data: {}
	})

	test.deepEqual(schema, null)
})
