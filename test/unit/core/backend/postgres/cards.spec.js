/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const errors = require('../../../../../lib/core/errors')
const cards = require('../../../../../lib/core/backend/postgres/cards')
const uuid = require('uuid/v4')

ava.before((test) => {
	test.context.context = {
		id: `UNIT-TEST-${uuid()}`
	}
})

ava('Should be able to convert a type card field path to that of a normal card (depth=1)', (test) => {
	const from = [ 'data', 'schema', 'properties', 'name' ]
	const result = cards.fromTypePath(from)

	const expected = [ 'name' ]

	test.deepEqual(result, expected)
})

ava('Should be able to convert a type card field path to that of a normal card (depth=2)', (test) => {
	const from = [ 'data', 'schema', 'properties', 'data', 'properties', 'actor' ]
	const result = cards.fromTypePath(from)

	const expected = [ 'data', 'actor' ]

	test.deepEqual(result, expected)
})

ava('Should be able to convert a type card field path to that of a normal card (depth=3)', (test) => {
	const from = [ 'data', 'schema', 'properties', 'data', 'properties', 'payload', 'properties', 'message' ]
	const result = cards.fromTypePath(from)

	const expected = [ 'data', 'payload', 'message' ]

	test.deepEqual(result, expected)
})

ava('Should be able to find multiple full-text search fields at various depths from a schema', (test) => {
	const schema = {
		slug: 'test',
		type: 'test@1.0.0',
		version: '1.0.0',
		name: 'Test type',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					name: {
						type: 'string',
						fullTextSearch: true
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						},
						fullTextSearch: true
					},
					data: {
						type: 'object',
						properties: {
							approvals: {
								type: 'array',
								items: {
									type: [ 'boolean', 'string' ]
								},
								fullTextSearch: true
							},
							observations: {
								anyOf: [
									{
										type: 'string',
										fullTextSearch: true
									},
									{
										type: 'array',
										items: {
											type: 'string'
										},
										fullTextSearch: true
									}
								]
							},
							category: {
								type: 'string',
								fullTextSearch: true
							},
							title: {
								type: 'string'
							},
							payload: {
								type: 'object',
								required: [ 'message' ],
								properties: {
									description: {
										type: 'string'
									},
									message: {
										type: 'string',
										format: 'markdown',
										fullTextSearch: true
									}
								}
							}
						}
					}
				}
			}
		}
	}
	const result = cards.parseFullTextSearchFields(test.context.context, schema, errors)

	const expected = [
		{
			path: [ 'name' ],
			isRootArray: false
		},
		{
			path: [ 'tags' ],
			isRootArray: true
		},
		{
			path: [ 'data', 'approvals' ],
			isRootArray: false
		},
		{
			path: [ 'data', 'observations' ],
			isRootArray: false
		},
		{
			path: [ 'data', 'category' ],
			isRootArray: false
		},
		{
			path: [ 'data', 'payload', 'message' ],
			isRootArray: false
		}
	]

	test.deepEqual(result, expected)
})

ava('Should error when an item does not have "string" as a type', (test) => {
	const schema = {
		slug: 'test',
		type: 'test@1.0.0',
		version: '1.0.0',
		name: 'Test type',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							approved: {
								type: [ 'boolean', 'null' ],
								fullTextSearch: true
							}
						}
					}
				}
			}
		}
	}

	try {
		cards.parseFullTextSearchFields(test.context.context, schema, errors)
		test.fail('This code should not run')
	} catch (err) {
		test.pass()
	}
})

ava('Should error when an array does not have "string" as a type', (test) => {
	const schema = {
		slug: 'test',
		type: 'test@1.0.0',
		version: '1.0.0',
		name: 'Test type',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							approved: {
								type: 'array',
								items: {
									type: [ 'boolean', 'null' ]
								},
								fullTextSearch: true
							}
						}
					}
				}
			}
		}
	}

	try {
		cards.parseFullTextSearchFields(test.context.context, schema, errors)
		test.fail('This code should not run')
	} catch (err) {
		test.pass()
	}
})

ava('Should error when a combinator non-array child does not have "string" as a type', (test) => {
	const schema = {
		slug: 'test',
		type: 'test@1.0.0',
		version: '1.0.0',
		name: 'Test type',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							observations: {
								anyOf: [
									{
										type: [ 'boolean', 'null' ],
										fullTextSearch: true
									}
								]
							}
						}
					}
				}
			}
		}
	}

	try {
		cards.parseFullTextSearchFields(test.context.context, schema, errors)
		test.fail('This code should not run')
	} catch (err) {
		test.pass()
	}
})

ava('Should error when a combinator array child does not have "string" as a type', (test) => {
	const schema = {
		slug: 'test',
		type: 'test@1.0.0',
		version: '1.0.0',
		name: 'Test type',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				required: [ 'version', 'data' ],
				properties: {
					version: {
						type: 'string',
						const: '1.0.0'
					},
					data: {
						type: 'object',
						properties: {
							observations: {
								anyOf: [
									{
										type: 'array',
										items: {
											type: [ 'boolean', 'null' ]
										},
										fullTextSearch: true
									}
								]
							}
						}
					}
				}
			}
		}
	}

	try {
		cards.parseFullTextSearchFields(test.context.context, schema, errors)
		test.fail('This code should not run')
	} catch (err) {
		test.pass()
	}
})
