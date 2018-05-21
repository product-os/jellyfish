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
const _ = require('lodash')
const randomstring = require('randomstring')
const core = require('../../lib/core')
const ActionRequestWorker = require('../../lib/actions')
const jellyscript = require('../../lib/jellyscript')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await core.create({
		backend: {
			host: process.env.TEST_DB_HOST,
			port: process.env.TEST_DB_PORT,
			database: `test_${randomstring.generate()}`
		},
		tables: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	test.context.session = test.context.jellyfish.sessions.admin
	test.context.admin = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	test.context.worker = new ActionRequestWorker(test.context.jellyfish, test.context.session)
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-user.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-session.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-event.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-update-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/event.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/create.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/update.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/triggered-action.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-active-triggered-actions.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-non-executed-action-requests.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-read-user-guest.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-write-user-guest.json'))
	const guestUserId = await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/user-guest.json'))

	test.context.guestSession = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'session-guest',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: guestUserId
		}
	})

	test.context.users = {
		guest: guestUserId
	}

	test.context.ids = {
		card: (await test.context.jellyfish.getCardBySlug(test.context.session, 'card')).id
	}
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'xxxxxxxxx',
		targetId: 'event',
		actorId: test.context.users.guest
	}, {
		properties: {
			slug: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'action-demo',
		type: 'action',
		tags: [],
		links: [],
		active: true,
		data: {
			arguments: {},
			options: {
				foo: 'bar'
			}
		}
	})

	const eventCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'event')

	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-demo',
		targetId: eventCard.id,
		actorId: test.context.users.guest
	}, {}), test.context.jellyfish.errors.JellyfishNoAction)
})

ava.test('.createRequest() should be able to create a user using action-create-user', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const id = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, id)
	test.is(pendingRequest.id, id)
	test.false(pendingRequest.data.executed)

	test.deepEqual(_.keys(pendingRequest.data.arguments), [
		'email',
		'hash',
		'username'
	])

	const requestId = await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, pendingRequest)
	test.is(requestId, id)

	const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, id)
	test.is(finishedRequest.id, id)
	test.true(finishedRequest.data.executed)
	test.false(finishedRequest.data.result.error)

	const user = await test.context.jellyfish.getCardById(test.context.session, finishedRequest.data.result.data)

	test.is(user.slug, 'user-johndoe')
	test.is(user.type, 'user')
	test.is(user.data.email, 'johndoe@example.com')
	test.deepEqual(user.data.roles, [ 'user-community' ])

	const hash1 = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-johndoe'
		}
	})

	const hash2 = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'fooquxbaz',
			salt: 'user-johndoe'
		}
	})

	test.is(hash1.value, user.data.password.hash)
	test.not(hash2.value, user.data.password.hash)
})

ava.test('.createRequest() should not store the password in the queue when using action-create-user', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const id = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const request = await test.context.jellyfish.getCardById(test.context.session, id)
	test.is(request.id, id)
	test.falsy(request.data.arguments.hash.string)
	test.falsy(request.data.arguments.hash.salt)
})

ava.test('.createRequest() should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const id = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, id)
	const requestId = await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, pendingRequest)
	test.is(requestId, id)
	const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, id)
	test.true(finishedRequest.data.executed)
	test.false(finishedRequest.data.result.error)

	const johnDoeUser = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')
	const loginRequestId = await test.context.worker.createRequest(test.context.jellyfish.sessions.admin, {
		targetId: johnDoeUser.id,
		actorId: guestUser.id,
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: johnDoeUser.slug
				}
			}
		}
	})

	const loginRequest = await test.context.jellyfish.getCardById(test.context.session, loginRequestId)
	test.falsy(loginRequest.data.arguments.password.hash.string)
	test.falsy(loginRequest.data.arguments.password.hash.salt)
})

ava.test('.createRequest() should login as a user with a password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const signupRequestId = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const signupRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, signupRequestId)
	await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, signupRequest)
	const finishedRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, signupRequestId)
	test.false(finishedRequest.data.result.error)

	const user = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')

	const loginRequestId = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: user.id,
		actorId: guestUser.id,
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: user.slug
				}
			}
		}
	})

	const loginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)
	await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, loginRequest)

	const finishedLoginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)
	const token = finishedLoginRequest.data.result.data

	test.false(finishedLoginRequest.data.result.error)
	test.is(loginRequest.id, loginRequestId)
	test.not(token, loginRequestId)
	test.not(token, signupRequestId)
	test.not(token, user.id)

	const session = await test.context.jellyfish.getCardById(test.context.session, token)

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: token,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	test.is(session.data.actor, user.id)
	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('.createRequest() should fail if login in with the wrong password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const signupRequestId = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const signupRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, signupRequestId)

	await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, signupRequest)

	const johnDoeUser = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')
	const loginRequestId = await test.context.worker.createRequest(test.context.jellyfish.sessions.admin, {
		targetId: johnDoeUser.id,
		actorId: guestUser.id,
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: 'xxxxxxxxxxxxxxxxxx',
					salt: johnDoeUser.slug
				}
			}
		}
	})

	const loginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)
	await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, loginRequest)
	const finishedLoginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)

	test.true(finishedLoginRequest.data.result.error)
	test.true(finishedLoginRequest.data.executed)
	test.is(finishedLoginRequest.data.result.data, 'Invalid password')
})

ava.test('.createRequest() should login as a password-less user', async (test) => {
	const id = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'user',
		slug: 'user-johndoe',
		active: true,
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')
	const loginRequestId = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: id,
		actorId: guestUser.id,
		action: 'action-create-session',
		arguments: {
			password: {}
		}
	})

	const loginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)
	await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, loginRequest)

	const finishedLoginRequest = await test.context.jellyfish.getCardById(test.context.jellyfish.sessions.admin, loginRequestId)
	const token = finishedLoginRequest.data.result.data
	test.false(finishedLoginRequest.data.result.error)
	const session = await test.context.jellyfish.getCardById(test.context.session, token)

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: token,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	const user = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-johndoe')
	test.is(session.data.actor, user.id)

	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('.processRequest() should set error to true given an arguments schema mismatch', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const id = await test.context.worker.createRequest(test.context.guestSession, {
		targetId: userCard.id,
		actorId: guestUser.id,
		action: 'action-create-user',
		arguments: {
			email: 'xxxxxxxxxxx',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const pendingRequest = await test.context.jellyfish.getCardById(test.context.guestSession, id)
	test.is(pendingRequest.id, id)
	test.false(pendingRequest.data.executed)

	const requestId = await test.context.worker.processRequest(test.context.jellyfish.sessions.admin, pendingRequest)
	test.is(requestId, id)

	const finishedRequest = await test.context.jellyfish.getCardById(test.context.guestSession, id)
	test.is(finishedRequest.id, id)
	test.true(finishedRequest.data.result.error)
	test.true(finishedRequest.data.executed)
	test.is(finishedRequest.data.result.data, 'Arguments do not match')
})

ava.test('.executeTriggers() should execute a matching triggered action', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	})

	const requests = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.is(requests.length, 1)

	for (const requestId of requests) {
		const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.false(pendingRequest.data.executed)
		await test.context.worker.processRequest(test.context.session, pendingRequest)
		const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.true(finishedRequest.data.executed)
		test.falsy(finishedRequest.data.result.error)
	}

	const result = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-bar-baz')
	test.deepEqual(_.omit(result, [ 'id' ]), {
		slug: 'foo-bar-baz',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.executeTriggers() should not do anything if there is no match', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	})

	const requests = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'foo-qux'
		}
	})

	test.is(requests.length, 0)
})

ava.test('.executeTriggers() should go through all triggered actions', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'qux-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: 'qux-bar-baz'
				}
			}
		}
	})

	const requests1 = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'foo-bar-baz'
		}
	})

	const requests2 = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'foo'
		}
	})

	const requests3 = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'qux-bar-baz'
		}
	})

	const requests4 = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'bar'
		}
	})

	const requests = _.compact(_.union(requests1, requests2, requests3, requests4))
	test.is(requests.length, 2)

	for (const requestId of requests) {
		const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.false(pendingRequest.data.executed)
		await test.context.worker.processRequest(test.context.session, pendingRequest)
		const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.true(finishedRequest.data.executed)
		test.falsy(finishedRequest.data.result.error)
	}

	const result1 = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-bar-baz')
	test.truthy(result1.id)

	const result2 = await test.context.jellyfish.getCardBySlug(test.context.session, 'qux-bar-baz')
	test.truthy(result2.id)
})

ava.test('.executeTriggers() should support source templates', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: '[source.data.action]',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: '[source.data.slug]',
					data: {
						number: '[source.data.number]'
					}
				}
			}
		}
	})

	const requests = await test.context.worker.executeTriggers(test.context.session, {
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			command: 'foo-bar-baz',
			action: 'action-create-card',
			slug: 'hello-world',
			number: 6
		}
	})

	test.is(requests.length, 1)

	for (const requestId of requests) {
		const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.false(pendingRequest.data.executed)
		await test.context.worker.processRequest(test.context.session, pendingRequest)
		const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
		test.true(finishedRequest.data.executed)
		test.falsy(finishedRequest.data.result.error)
	}

	const result1 = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-bar-baz')
	test.falsy(result1)

	const result2 = await test.context.jellyfish.getCardBySlug(test.context.session, 'hello-world')
	test.deepEqual(_.omit(result2, [ 'id' ]), {
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			number: 6
		}
	})
})

ava.test('.createRequest() should execute triggered actions', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: [],
		tags: [],
		data: {
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: '[source.data.action]',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: '[source.data.slug]',
					data: {
						number: '[source.data.number]'
					}
				}
			}
		}
	})

	const resultBefore = await test.context.jellyfish.getCardBySlug(test.context.session, 'triggered-card')
	test.falsy(resultBefore)

	const requestId = await test.context.worker.createRequest(test.context.session, {
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		action: 'action-create-card',
		arguments: {
			properties: {
				slug: 'card-with-trigger',
				data: {
					command: 'foo-bar-baz',
					action: 'action-create-card',
					slug: 'triggered-card',
					number: 7
				}
			}
		}
	})

	const pendingRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
	await test.context.worker.processRequest(test.context.session, pendingRequest)
	const finishedRequest = await test.context.jellyfish.getCardById(test.context.session, requestId)
	test.false(finishedRequest.data.result.error)

	const cardWithTrigger = await test.context.jellyfish.getCardById(test.context.session, finishedRequest.data.result.data)
	test.deepEqual(cardWithTrigger, {
		id: finishedRequest.data.result.data,
		slug: 'card-with-trigger',
		type: 'card',
		active: true,
		tags: [],
		links: [],
		data: {
			action: 'action-create-card',
			command: 'foo-bar-baz',
			slug: 'triggered-card',
			number: 7
		}
	})

	const requests = await test.context.worker.getPendingRequests(test.context.session)
	for (const triggeredRequestId of _.map(requests, 'id')) {
		const pendingTriggeredRequest = await test.context.jellyfish.getCardById(test.context.session, triggeredRequestId)
		test.false(pendingTriggeredRequest.data.executed)
		await test.context.worker.processRequest(test.context.session, pendingTriggeredRequest)
		const finishedTriggeredRequest = await test.context.jellyfish.getCardById(test.context.session, triggeredRequestId)
		test.true(finishedTriggeredRequest.data.executed)
		test.falsy(finishedTriggeredRequest.data.result.error)
	}

	const resultAfter = await test.context.jellyfish.getCardBySlug(test.context.session, 'triggered-card')
	test.deepEqual(_.omit(resultAfter, [ 'id' ]), {
		slug: 'triggered-card',
		type: 'card',
		active: true,
		tags: [],
		links: [],
		data: {
			number: 7
		}
	})
})
