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
require('ts-node').register()

const _ = require('lodash')
const ava = require('ava')
const randomstring = require('randomstring')
const utils = require('../../../lib/utils')
const {
	getSdk
} = require('@resin.io/jellyfish-sdk')
const createServer = require('../../../lib/server.js')

ava.test('should create a card', async (test) => {
	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	})

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, result.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if the card type does not exist', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: 'foobarbazqux',
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishNoElement)
})

ava.test('should fail if the card already exists', async (test) => {
	const card = {
		slug: 'johndoe',
		links: [],
		tags: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	}

	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: card
	})

	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: card
	}), test.context.jellyfish.errors.JellyfishElementAlreadyExists)

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, result.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if there is a schema mismatch', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.user,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'foobar',
			data: {
				email: 1
			}
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('should fail if the element is not a valid card', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			foo: 'bar'
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('should create an inactive card', async (test) => {
	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			active: false,
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: false,
		data: {
			email: 'johndoe@example.com'
		}
	})
})

ava.test('should create a card with more extra data properties', async (test) => {
	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com',
				foobar: true
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			foobar: true
		}
	})

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, result.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should evaluate a simple computed property on insertion', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-type',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-type'
						},
						data: {
							type: 'object',
							properties: {
								foo: {
									type: 'string',
									$formula: 'UPPER(input)'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				foo: 'hello'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		type: 'test-type',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'HELLO'
		}
	})
})

ava.test('should throw if the result of the formula is incompatible with the given type', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-type',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-type'
						},
						data: {
							type: 'object',
							properties: {
								foo: {
									type: 'number',
									$formula: 'UPPER(input)'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				foo: 'hello'
			}
		}
	}), test.context.jellyfish.JellyfishSchemaMismatch)
})

ava.test('AGGREGATE($events): should react to one event', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-thread',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.mentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	const admin = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	const thread = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				timestamp: '2018-05-05T00:21:02.459Z',
				target: thread.id,
				actor: admin,
				payload: {
					mentions: [ 'johndoe' ]
				}
			}
		}
	})

	await test.context.flushRequests()
	const card = await test.context.jellyfish.getCardById(test.context.session, thread.id)
	test.deepEqual(card.data.mentions, [ 'johndoe' ])
})

ava.test('AGGREGATE($events): should add one triggered action if instantiating the type multiple times', async (test) => {
	const typeProperties = {
		slug: 'test-thread',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-thread'
					},
					data: {
						type: 'object',
						properties: {
							mentions: {
								type: 'array',
								$formula: 'AGGREGATE($events, "data.payload.mentions")'
							}
						},
						additionalProperties: true
					}
				},
				additionalProperties: true,
				required: [ 'type', 'data' ]
			}
		}
	}

	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: typeProperties
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	const triggeredActions = await test.context.jellyfish.query(test.context.session, {
		type: 'object',
		required: [ 'active', 'type' ],
		additionalProperties: true,
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})

	test.is(triggeredActions.length, 1)
})

ava.test('AGGREGATE($events): should consider updates to the type', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-thread',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.mentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	const newType = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-update-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.newMentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	test.is(type.id, newType.id)

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	const triggeredActions = await test.context.jellyfish.query(test.context.session, {
		type: 'object',
		required: [ 'active', 'type' ],
		additionalProperties: true,
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})

	test.is(triggeredActions.length, 1)
})

ava.test('AGGREGATE($events): should work with $$ prefixed properties', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-thread',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								$$mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.$$mentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	const admin = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	const thread = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				$$mentions: []
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				timestamp: '2018-05-05T00:21:02.459Z',
				target: thread.id,
				actor: admin,
				payload: {
					$$mentions: [ 'johndoe' ]
				}
			}
		}
	})

	await test.context.flushRequests()
	const card = await test.context.jellyfish.getCardById(test.context.session, thread.id)
	test.deepEqual(card.data.$$mentions, [ 'johndoe' ])
})

ava.test('AGGREGATE($events): should be able to add a type with a formula based on its timeline', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-thread',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.mentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	const admin = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	const thread = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				mentions: []
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				timestamp: '2018-05-05T00:21:02.459Z',
				target: thread.id,
				actor: admin,
				payload: {
					mentions: [ 'johndoe' ]
				}
			}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				timestamp: '2018-05-05T00:28:42.302Z',
				target: thread.id,
				actor: admin,
				payload: {
					mentions: [ 'janedoe', 'johnsmith' ]
				}
			}
		}
	})

	await test.context.flushRequests()
	const card = await test.context.jellyfish.getCardById(test.context.session, thread.id)
	test.deepEqual(card.data.mentions, [ 'johndoe', 'janedoe', 'johnsmith' ])
})

ava.test('AGGREGATE($events): should create a property on the target if it does not exist', async (test) => {
	const type = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-thread',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
						},
						data: {
							type: 'object',
							properties: {
								mentions: {
									type: 'array',
									$formula: 'AGGREGATE($events, "data.payload.mentions")'
								}
							},
							additionalProperties: true
						}
					},
					additionalProperties: true,
					required: [ 'type', 'data' ]
				}
			}
		}
	})

	const admin = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	const thread = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {}
		}
	})

	await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				timestamp: '2018-05-05T00:21:02.459Z',
				target: thread.id,
				actor: admin,
				payload: {
					mentions: [ 'johndoe' ]
				}
			}
		}
	})

	await test.context.flushRequests()
	const card = await test.context.jellyfish.getCardById(test.context.session, thread.id)
	test.deepEqual(card.data.mentions, [ 'johndoe' ])
})

ava.test('AGGREGATE($events): should work when creating cards via the SDK', async (test) => {
	// Set this env var so that the server uses a random database
	process.env.SERVER_DATABASE = `test_${randomstring.generate()}`
	const {
		jellyfish,
		port
	} =	await createServer()
	const adminSession = jellyfish.sessions.admin

	// Since AVA tests are running concurrently, set up an SDK instance that will
	// communicate with whichever port this server instance bound to
	const sdk = getSdk({
		apiPrefix: process.env.API_PREFIX || 'api/v1',
		apiUrl: `http://localhost:${port}`
	})

	// Create a new user
	const userId = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	// Sign in as the admin
	await sdk.setAuthToken(adminSession)

	// Update the user's permissions
	await sdk.card.update(userId, {
		data: {
			roles: [ 'user-team' ]
		}
	})

	// Login as the new user
	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	// Create a new thread element
	const threadId = await sdk.card.create({
		type: 'thread',
		name: 'test-thread',
		data: {}
	})

	// Add a message to the thread element
	await sdk.card.create({
		type: 'message',
		data: {
			timestamp: '2018-05-05T00:21:02.459Z',
			target: threadId,
			actor: userId,
			payload: {
				message: 'lorem ipsum dolor sit amet',
				mentionsUser: [ 'johndoe' ]
			}
		}
	})

	const card = await sdk.card.get(threadId)

	test.deepEqual(card.data.mentionsUser, [ 'johndoe' ])
})
