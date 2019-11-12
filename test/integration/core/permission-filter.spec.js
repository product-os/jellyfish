/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const permissionFilter = require('../../../lib/core/permission-filter')
const errors = require('../../../lib/core/errors')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

ava.beforeEach(helpers.kernel.beforeEach)
ava.afterEach(helpers.kernel.afterEach)

ava('.getSessionUser() should throw if the session is invalid', async (test) => {
	await test.throwsAsync(permissionFilter.getSessionUser(
		test.context.context, test.context.backend, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
			user: 'cards',
			session: 'sessions'
		}), errors.JellyfishInvalidSession)
})

ava('.getSessionUser() should throw if the session actor is invalid', async (test) => {
	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishNoElement)
})

ava('.getSessionUser() should get the session user given the session did not expire', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'foo', 'bar' ]
			}
		})

	const date = new Date()
	date.setDate(date.getDate() + 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: result.id,
			expiration: date.toISOString()
		}
	})

	const user = await permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	})

	test.deepEqual(user, Object.assign({
		id: result.id
	}, user))
})

ava('.getSessionUser() should throw if the session expired', async (test) => {
	const user = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'foo', 'bar' ]
			}
		})

	const date = new Date()
	date.setDate(date.getDate() - 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: user.id,
			expiration: date.toISOString()
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishSessionExpired)
})

ava('.getViews() should return an empty array given no views', async (test) => {
	const filters = await permissionFilter.getViews(test.context.context, test.context.backend, [])
	test.deepEqual(filters, [])
})

ava('.getViews() should return the schema of a single view', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
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
	})

	const views = await permissionFilter.getViews(test.context.context, test.context.backend, [
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

ava('.getViews() should ignore undefined views', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
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
	})

	const views = await permissionFilter.getViews(test.context.context, test.context.backend, [
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

ava('.getViews() should ignore cards that are not views', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-hello',
		type: 'card',
		version: '1.0.0',
		data: {
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
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
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
	})

	const views = await permissionFilter.getViews(test.context.context, test.context.backend, [
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

ava('.getViews() should return the schemas of two roles', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
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
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'view-read-bar',
		type: 'view',
		version: '1.0.0',
		data: {
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
	})

	const views = await permissionFilter.getViews(test.context.context, test.context.backend, [
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

ava('.getViewSchema() should return null if the card is not a view', (test) => {
	const schema = permissionFilter.getViewSchema(CARDS['user-admin'])
	test.deepEqual(schema, null)
})

ava('.getViewSchema() should preserve template interpolations in user properties', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should preserve template interpolations in schema properties', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return a schema given a view card with two conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return a schema given a view card with two conjunctions and empty disjunctions', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return a schema given a view card with two disjunctions', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return a schema given a view card with two disjunctions and empty conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return a schema given a view card with two disjunctions and two conjunctions', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
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

ava('.getViewSchema() should return null given a view card with no filters', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		version: '1.0.0',
		data: {}
	})

	test.deepEqual(schema, null)
})
