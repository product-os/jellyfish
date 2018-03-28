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
const actions = require('../../lib/actions')
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
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
	await test.throws(actions.executeAction(test.context.jellyfish, 'xxxxxxxxx', 'event', {
		properties: {
			slug: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
	await test.context.jellyfish.insertCard({
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

	await test.throws(actions.executeAction(
		test.context.jellyfish,
		'action-demo',
		'event',
		{}
	), test.context.jellyfish.errors.JellyfishNoAction)
})

ava.test('.createRequest() should be able to create a user using action-create-user', async (test) => {
	const id = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user',
		actorId: 'user-admin',
		action: 'action-create-user',
		transient: {
			password: 'foobarbaz'
		},
		arguments: {
			email: 'johndoe@example.com',
			username: 'johndoe',
			salt: '{{ GENERATESALT() }}',
			hash: '{{ HASH(properties.transient.password, properties.data.arguments.salt) }}'
		}
	})

	const pendingRequest = await test.context.jellyfish.getCard(id)
	test.is(pendingRequest.id, id)
	test.false(pendingRequest.data.executed)
	test.falsy(pendingRequest.transient)
	test.falsy(pendingRequest.data.transient)

	test.deepEqual(_.keys(pendingRequest.data.arguments), [
		'email',
		'hash',
		'salt',
		'username'
	])

	const requestId = await actions.processRequest(test.context.jellyfish, pendingRequest)
	test.is(requestId, id)

	const finishedRequest = await test.context.jellyfish.getCard(id)
	test.is(finishedRequest.id, id)
	test.true(finishedRequest.data.executed)
	test.false(finishedRequest.data.result.error)

	const user = await test.context.jellyfish.getCard(finishedRequest.data.result.data)

	test.is(user.slug, 'user-johndoe')
	test.is(user.type, 'user')
	test.is(user.data.email, 'johndoe@example.com')
	test.deepEqual(user.data.roles, [])

	test.true(credentials.check('foobarbaz', user.data.password))
	test.false(credentials.check('fooquxbaz', user.data.password))
})

ava.test('.createRequest() should login as a user with a password', async (test) => {
	const signupRequestId = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user',
		actorId: 'user-admin',
		action: 'action-create-user',
		transient: {
			password: 'foobarbaz'
		},
		arguments: {
			email: 'johndoe@example.com',
			username: 'johndoe',
			salt: '{{ GENERATESALT() }}',
			hash: '{{ HASH(properties.transient.password, properties.data.arguments.salt) }}'
		}
	})

	const signupRequest = await test.context.jellyfish.getCard(signupRequestId)
	await actions.processRequest(test.context.jellyfish, signupRequest)

	const user = await test.context.jellyfish.getCard('user-johndoe')

	const loginRequestId = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user-johndoe',
		actorId: 'user-admin',
		action: 'action-user-login',
		transient: {
			password: 'foobarbaz'
		},
		arguments: {
			password: {
				hash: `{{ HASH(properties.transient.password, '${user.data.password.salt}') }}`
			}
		}
	})

	const loginRequest = await test.context.jellyfish.getCard(loginRequestId)
	await actions.processRequest(test.context.jellyfish, loginRequest)

	const finishedLoginRequest = await test.context.jellyfish.getCard(loginRequestId)
	const token = finishedLoginRequest.data.result.data

	test.false(finishedLoginRequest.data.result.error)
	test.is(loginRequest.id, loginRequestId)
	test.not(token, loginRequestId)
	test.not(token, signupRequestId)
	test.not(token, user.id)

	const session = await test.context.jellyfish.getCard(token)

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: token,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('.createRequest() should throw an error if login in with the wrong password', async (test) => {
	const signupRequestId = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user',
		actorId: 'user-admin',
		action: 'action-create-user',
		transient: {
			password: 'foobarbaz'
		},
		arguments: {
			email: 'johndoe@example.com',
			username: 'johndoe',
			salt: '{{ GENERATESALT() }}',
			hash: '{{ HASH(properties.transient.password, properties.data.arguments.salt) }}'
		}
	})

	const signupRequest = await test.context.jellyfish.getCard(signupRequestId)
	await actions.processRequest(test.context.jellyfish, signupRequest)

	const user = await test.context.jellyfish.getCard('user-johndoe')

	const loginRequestId = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user-johndoe',
		actorId: 'user-admin',
		action: 'action-user-login',
		transient: {
			password: 'xxxxxxxxxxxxxxxxxx'
		},
		arguments: {
			password: {
				hash: `{{ HASH(properties.transient.password, '${user.data.password.salt}') }}`
			}
		}
	})

	const loginRequest = await test.context.jellyfish.getCard(loginRequestId)
	await test.throws(actions.processRequest(test.context.jellyfish, loginRequest), 'Invalid password')
})

ava.test('.createRequest() should login as a password-less user', async (test) => {
	await test.context.jellyfish.insertCard({
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

	const loginRequestId = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user-johndoe',
		actorId: 'user-admin',
		action: 'action-user-login',
		arguments: {
			password: {}
		}
	})

	const loginRequest = await test.context.jellyfish.getCard(loginRequestId)
	await actions.processRequest(test.context.jellyfish, loginRequest)

	const finishedLoginRequest = await test.context.jellyfish.getCard(loginRequestId)
	const token = finishedLoginRequest.data.result.data
	test.false(finishedLoginRequest.data.result.error)
	const session = await test.context.jellyfish.getCard(token)

	test.deepEqual(_.omit(session, [ 'data' ]), {
		id: token,
		type: 'session',
		active: true,
		links: [],
		tags: []
	})

	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava.test('.processRequest() should set error to true given an arguments schema mismatch', async (test) => {
	const id = await actions.createRequest(test.context.jellyfish, {
		targetId: 'user',
		actorId: 'user-admin',
		action: 'action-create-user',
		transient: {
			password: 'foobarbaz'
		},
		arguments: {
			email: 'xxxxxxxxxxx',
			username: 'johndoe',
			salt: '{{ GENERATESALT() }}',
			hash: '{{ HASH(properties.transient.password, properties.data.arguments.salt) }}'
		}
	})

	const pendingRequest = await test.context.jellyfish.getCard(id)
	test.is(pendingRequest.id, id)
	test.false(pendingRequest.data.executed)

	const requestId = await actions.processRequest(test.context.jellyfish, pendingRequest)
	test.is(requestId, id)

	const finishedRequest = await test.context.jellyfish.getCard(id)
	test.is(finishedRequest.id, id)
	test.true(finishedRequest.data.result.error)
	test.true(finishedRequest.data.executed)
	test.is(finishedRequest.data.result.data, 'Arguments do not match')
})
