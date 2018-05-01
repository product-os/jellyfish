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
const sdk = require('../../lib/sdk')
const ActionRequestWorker = require('../../lib/actions')
const credentials = require('../../lib/actions/credentials')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await sdk.create({
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

	await test.context.jellyfish.initialize()
	test.context.session = test.context.jellyfish.sessions.admin
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
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, 'xxxxxxxxx', 'event', {
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

	await test.throws(test.context.worker.executeAction(
		test.context.session,
		'action-demo',
		eventCard.id,
		{}
	), test.context.jellyfish.errors.JellyfishNoAction)
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

	const requestId = await test.context.worker.processRequest(pendingRequest)
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

	test.is(credentials.hash('foobarbaz', 'user-johndoe'), user.data.password.hash)
	test.not(credentials.hash('fooquxbaz', 'user-johndoe'), user.data.password.hash)
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
	await test.context.worker.processRequest(signupRequest)

	const user = await test.context.jellyfish.getCardBySlug(test.context.jellyfish.sessions.admin, 'user-johndoe')

	const loginRequestId = await test.context.worker.createRequest(test.context.jellyfish.sessions.admin, {
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
	await test.context.worker.processRequest(loginRequest)

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

	await test.context.worker.processRequest(signupRequest)

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
	await test.context.worker.processRequest(loginRequest)
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
	await test.context.worker.processRequest(loginRequest)

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

	const requestId = await test.context.worker.processRequest(pendingRequest)
	test.is(requestId, id)

	const finishedRequest = await test.context.jellyfish.getCardById(test.context.guestSession, id)
	test.is(finishedRequest.id, id)
	test.true(finishedRequest.data.result.error)
	test.true(finishedRequest.data.executed)
	test.is(finishedRequest.data.result.data, 'Arguments do not match')
})
