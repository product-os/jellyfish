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
const errors = require('../../lib/actions/errors')
const helpers = require('./helpers')

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
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-read-user-team-admin.json'))
	const guestUser = await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/user-guest.json'))

	const guestSession = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'session-guest',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: guestUser.id
		}
	})

	test.context.guestSession = guestSession.id
	test.context.users = {
		guest: guestUser.id
	}

	test.context.ids = {
		card: (await test.context.jellyfish.getCardBySlug(test.context.session, 'card')).id
	}

	await test.context.worker.start()
})

ava.test.afterEach(async (test) => {
	await test.context.worker.stop()
	await test.context.jellyfish.disconnect()
})

ava.test('should fail if the action id does not exist', async (test) => {
	await test.throws(helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'xxxxxxxxx',
		targetId: 'event',
		actorId: test.context.users.guest,
		arguments: {
			properties: {
				slug: 'hello'
			}
		}
	}), errors.ActionsNoElement)
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

	await test.throws(helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-demo',
		targetId: eventCard.id,
		actorId: test.context.users.guest,
		arguments: {}
	}), errors.ActionsNoElement)
})

ava.test('.createRequest() should not store the password in the queue when using action-create-user', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const pendingRequest = await test.context.worker.createRequest(test.context.guestSession, {
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

	test.falsy(pendingRequest.data.arguments.hash.string)
	test.falsy(pendingRequest.data.arguments.hash.salt)
})

ava.test('.createRequest() should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	await helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
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

	const johnDoeUser = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')
	const loginRequest = await test.context.worker.createRequest(test.context.jellyfish.sessions.admin, {
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

	test.falsy(loginRequest.data.arguments.password.hash.string)
	test.falsy(loginRequest.data.arguments.password.hash.salt)
})

ava.test('should login as a user with a password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	await helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
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

	const user = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')

	const session = await helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
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

	test.not(session.id, user.id)

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: session.id,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	test.is(session.data.actor, user.id)
	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('should fail if login in with the wrong password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	const johnDoeUser = await helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
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

	await test.throws(helpers.executeAction(test.context.jellyfish.sessions.admin, test.context.worker, test.context.jellyfish, {
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
	}), errors.ActionsAuthenticationError)
})

ava.test('.createRequest() should login as a password-less user', async (test) => {
	const user = await test.context.jellyfish.insertCard(test.context.session, {
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
	const session = await helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
		targetId: user.id,
		actorId: guestUser.id,
		action: 'action-create-session',
		arguments: {
			password: {}
		}
	})

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: session.id,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	test.is(session.data.actor, (await test.context.jellyfish.getCardBySlug(test.context.session, 'user-johndoe')).id)
	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('should throw given an arguments schema mismatch', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user')
	const guestUser = await test.context.jellyfish.getCardBySlug(test.context.guestSession, 'user-guest')

	await test.throws(helpers.executeAction(test.context.guestSession, test.context.worker, test.context.jellyfish, {
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
	}), errors.ActionsSchemaMismatch)
})

ava.test('should execute a matching triggered action', async (test) => {
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

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

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

ava.test('should not execute an inactive matching triggered action', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: false,
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

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	const result = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-bar-baz')
	test.falsy(result)
})

ava.test('should do nothing if there is no triggered action match', async (test) => {
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

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo-qux'
				}
			}
		}
	})

	const result = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-qux')
	test.falsy(result)
})

ava.test('should go through all triggered actions', async (test) => {
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

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo'
				}
			}
		}
	})

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'qux-bar-baz'
				}
			}
		}
	})

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'bar'
				}
			}
		}
	})

	const result1 = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo-bar-baz')
	test.truthy(result1.id)

	const result2 = await test.context.jellyfish.getCardBySlug(test.context.session, 'foo')
	test.falsy(result2)

	const result3 = await test.context.jellyfish.getCardBySlug(test.context.session, 'qux-bar-baz')
	test.truthy(result3.id)

	const result4 = await test.context.jellyfish.getCardBySlug(test.context.session, 'bar')
	test.falsy(result4)
})

ava.test('should support source templates in triggered actions', async (test) => {
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
			action: '{source.data.action}',
			target: test.context.ids.card,
			arguments: {
				properties: {
					slug: '{source.data.slug}',
					data: {
						number: '{source.data.number}'
					}
				}
			}
		}
	})

	await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.admin.id,
		arguments: {
			properties: {
				data: {
					command: 'foo-bar-baz',
					action: 'action-create-card',
					slug: 'hello-world',
					number: 6
				}
			}
		}
	})

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

ava.test('the user-team-admin should be able to update other user roles', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'user')

	const teamAdmin = await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-user',
		targetId: userCard.id,
		actorId: test.context.admin.id,
		arguments: {
			email: 'admin@jellyfish.com',
			username: 'user-team-admin',
			hash: {
				string: 'foobar',
				salt: 'user-team-admin'
			}
		}
	})

	const user = await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-user',
		targetId: userCard.id,
		actorId: test.context.admin.id,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foo',
				salt: 'user-johndoe'
			}
		}
	})

	test.deepEqual(user.data.roles, [ 'user-community' ])

	const session = await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-create-session',
		targetId: teamAdmin.id,
		actorId: test.context.admin.id,
		arguments: {
			password: {
				hash: {
					string: 'foobar',
					salt: 'user-team-admin'
				}
			}
		}
	})

	await helpers.executeAction(session.id, test.context.worker, test.context.jellyfish, {
		action: 'action-update-card',
		targetId: user.id,
		actorId: teamAdmin.id,
		arguments: {
			properties: {
				data: {
					roles: [ 'user-community', 'user-team' ]
				}
			}
		}
	})

	const userAfter = await test.context.jellyfish.getCardById(test.context.session, user.id)
	test.deepEqual(userAfter.data.roles, [ 'user-community', 'user-team' ])
})
