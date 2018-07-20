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

const ava = require('ava')
const permissionFilter = require('../../lib/core/permission-filter')
const errors = require('../../lib/core/errors')
const CARDS = require('../../lib/core/cards')
const helpers = require('./helpers')

ava.test.beforeEach(helpers.kernel.beforeEach)
ava.test.afterEach(helpers.kernel.afterEach)

ava.test('.getSessionUser() should throw if the session is invalid', async (test) => {
	await test.throws(permissionFilter.getSessionUser(test.context.backend, 'xxxxxxxxxxxxxxxxxxxxxxxxxx', {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishNoElement)
})

ava.test('.getSessionUser() should throw if the session actor is invalid', async (test) => {
	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: {},
		tags: [],
		data: {
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	await test.throws(permissionFilter.getSessionUser(test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishNoElement)
})

ava.test('.getSessionUser() should get the session user given the session did not expire', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: [ 'foo', 'bar' ]
		}
	})

	const date = new Date()
	date.setDate(date.getDate() + 1)

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: {},
		tags: [],
		data: {
			actor: result.id,
			expiration: date.toISOString()
		}
	})

	const user = await permissionFilter.getSessionUser(test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	})

	test.deepEqual(user, Object.assign({
		id: result.id
	}, user))
})

ava.test('.getSessionUser() should throw if the session expired', async (test) => {
	const user = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: [ 'foo', 'bar' ]
		}
	})

	const date = new Date()
	date.setDate(date.getDate() - 1)

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: {},
		tags: [],
		data: {
			actor: user.id,
			expiration: date.toISOString()
		}
	})

	await test.throws(permissionFilter.getSessionUser(test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishSessionExpired)
})

ava.test('.getViews() should return an empty array given no views', async (test) => {
	const filters = await permissionFilter.getViews(test.context.backend, [])
	test.deepEqual(filters, [])
})

ava.test('.getViews() should return the schema of a single view', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Active cards',
					schema: {
						type: 'object',
						properties: {
							active: {
								type: 'boolean',
								const: true
							}
						},
						required: [ 'active' ]
					}
				}
			]
		}
	})

	const views = await permissionFilter.getViews(test.context.backend, [
		'view-read-foo'
	])

	const filters = views.map((view) => {
		return permissionFilter.getViewSchema(view)
	})

	test.deepEqual(filters, [
		{
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					const: true
				}
			},
			required: [ 'active' ]
		}
	])
})

ava.test('.getViews() should ignore undefined views', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Active cards',
					schema: {
						type: 'object',
						properties: {
							active: {
								type: 'boolean',
								const: true
							}
						},
						required: [ 'active' ]
					}
				}
			]
		}
	})

	const views = await permissionFilter.getViews(test.context.backend, [
		'view-hello',
		'view-read-foo',
		'view-world'
	])

	const filters = views.map((view) => {
		return permissionFilter.getViewSchema(view)
	})

	test.deepEqual(filters, [
		{
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					const: true
				}
			},
			required: [ 'active' ]
		}
	])
})

ava.test('.getViews() should ignore cards that are not views', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-hello',
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Action cards',
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
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Active cards',
					schema: {
						type: 'object',
						properties: {
							active: {
								type: 'boolean',
								const: true
							}
						},
						required: [ 'active' ]
					}
				}
			]
		}
	})

	const views = await permissionFilter.getViews(test.context.backend, [
		'view-read-hello',
		'view-read-foo'
	])

	const filters = views.map((view) => {
		return permissionFilter.getViewSchema(view)
	})

	test.deepEqual(filters, [
		{
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					const: true
				}
			},
			required: [ 'active' ]
		}
	])
})

ava.test('.getViews() should return the schemas of two roles', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Active cards',
					schema: {
						type: 'object',
						properties: {
							active: {
								type: 'boolean',
								const: true
							}
						},
						required: [ 'active' ]
					}
				}
			]
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-bar',
		type: 'view',
		tags: [],
		links: {},
		active: true,
		data: {
			allOf: [
				{
					name: 'Action cards',
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
	})

	const views = await permissionFilter.getViews(test.context.backend, [
		'view-read-foo',
		'view-read-bar'
	])

	const filters = views.map((view) => {
		return permissionFilter.getViewSchema(view)
	})

	test.deepEqual(filters, [
		{
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					const: true
				}
			},
			required: [ 'active' ]
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
	])
})

ava.test('.getViewSchema() should return null if the card is not a view', (test) => {
	const schema = permissionFilter.getViewSchema(CARDS['user-admin'])
	test.deepEqual(schema, null)
})

ava.test('.getViewSchema() should preserve template interpolations in user properties', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
		data: {
			allOf: [
				{
					name: 'foo',
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
			]
		}
	})

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

ava.test('.getViewSchema() should preserve template interpolations in schema properties', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
		data: {
			allOf: [
				{
					name: 'foo',
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
			]
		}
	})

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

ava.test('.getViewSchema() should return a schema given a view card with two conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
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
	})

	test.deepEqual(schema, {
		type: 'object',
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

ava.test('.getViewSchema() should return a schema given a view card with two conjunctions and empty disjunctions', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
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
	})

	test.deepEqual(schema, {
		type: 'object',
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

ava.test('.getViewSchema() should return a schema given a view card with two disjunctions', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
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
	})

	test.deepEqual(schema, {
		type: 'object',
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

ava.test('.getViewSchema() should return a schema given a view card with two disjunctions and empty conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
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
	})

	test.deepEqual(schema, {
		type: 'object',
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

ava.test('.getViewSchema() should return a schema given a view card with two disjunctions and two conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
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
	})

	test.deepEqual(schema, {
		type: 'object',
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

ava.test('.getViewSchema() should return null given a view card with no filters', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		links: {},
		tags: [],
		active: true,
		data: {}
	})

	test.deepEqual(schema, null)
})
