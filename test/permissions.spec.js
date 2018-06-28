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

const ava = require('ava')
const _ = require('lodash')
const randomstring = require('randomstring')
const {
	getSdk
} = require('@resin.io/jellyfish-sdk')
const createServer = require('../lib/server.js')

ava.test.beforeEach(async (test) => {
	// Set this env var so that the server uses a random database
	process.env.SERVER_DATABASE = `test_${randomstring.generate()}`
	const {
		jellyfish,
		port
	} =	await createServer()
	test.context.jellyfish = jellyfish

	test.context.session = test.context.jellyfish.sessions.admin
	test.context.guestSession = test.context.jellyfish.sessions.guest

	// Since AVA tests are running concurrently, set up an SDK instance that will
	// communicate with whichever port this server instance bound to
	test.context.sdk = getSdk({
		apiPrefix: process.env.API_PREFIX || 'api/v1',
		apiUrl: `http://localhost:${port}`
	})
})

ava.test.serial('.query() should only return the user itself for the guest user', async (test) => {
	const results = await test.context.sdk.query({
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})

	test.deepEqual(_.map(results, 'slug'), [ 'user-guest' ])
})

ava.test.serial('.query() should be able to see previously restricted cards after a permissions change', async (test) => {
	const {
		sdk
	} = test.context

	const user = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const repo = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'repo',
		name: 'Test repo',
		tags: [],
		links: [],
		active: true,
		data: {}
	})

	const unprivilegedResults = await sdk.card.get(repo.id)

	test.deepEqual(unprivilegedResults, null)

	await test.context.jellyfish.insertCard(test.context.session, {
		id: user.id,
		slug: 'user-johndoe',
		type: 'user',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-team' ]
		}
	}, {
		override: true
	})

	const privilegedResults = await sdk.card.get(repo.id)
	test.deepEqual(privilegedResults.id, repo.id)
})

ava.test.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context

	const user = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const thread = await sdk.card.create({
		type: 'thread',
		data: {}
	})

	await sdk.card.update(thread.id, {
		data: {
			description: 'Lorem ipsum dolor sit amer'
		}
	})

	const timeline = await sdk.card.getTimeline(thread.id)

	const timelineActors = _.uniq(timeline.map((card) => {
		return card.data.actor
	}))

	test.deepEqual(timelineActors, [ user.id ])
})

ava.test.serial('.query() community users should be able to query views', async (test) => {
	await test.context.sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await test.context.sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const results = await test.context.sdk.query({
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'view'
			}
		}
	})

	test.true(_.includes(_.map(results, 'slug'), 'view-all-views'))
})

ava.test.serial('the guest user should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await test.throws(sdk.card.update(
		targetUser.id,
		{
			data: {
				password: {
					hash: '6dafdadfffffffaaaaa'
				}
			}
		}
	))
})

ava.test.serial('users with the "user-community" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.signup({
		username: 'communityuser',
		email: 'communityuser@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: 'communityuser',
		password: 'foobarbaz'
	})

	await test.throws(sdk.card.update(
		targetUser.id,
		{
			data: {
				password: {
					hash: '6dafdadfffffffaaaaa'
				}
			}
		}
	))
})

ava.test.serial('users with the "user-team" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const role = 'user-team'

	const targetUser = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	const teamUser = await sdk.auth.signup({
		username: 'teamuser',
		email: 'teamuser@example.com',
		password: 'foobarbaz'
	})

	// Update the role on the team user
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(teamUser, {
			data: {
				roles: [ role ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login({
		username: 'teamuser',
		password: 'foobarbaz'
	})

	await test.throws(sdk.card.update(
		targetUser.id,
		{
			data: {
				password: {
					hash: '6dafdadfffffffaaaaa'
				}
			}
		}
	))
})

ava.test.serial('AGGREGATE($events): should work when creating cards via the SDK', async (test) => {
	const {
		sdk
	} = test.context

	// Create a new user
	const user = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	// Sign in as the admin
	await sdk.setAuthToken(test.context.session)

	// Update the user's permissions
	await sdk.card.update(user.id, {
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
	const thread = await sdk.card.create({
		type: 'thread',
		name: 'test-thread',
		data: {}
	})

	// Add a message to the thread element
	await sdk.card.create({
		type: 'message',
		data: {
			timestamp: '2018-05-05T00:21:02.459Z',
			target: thread.id,
			actor: user.id,
			payload: {
				message: 'lorem ipsum dolor sit amet',
				mentionsUser: [ 'johndoe' ]
			}
		}
	})

	const card = await sdk.card.get(thread.id)

	test.deepEqual(card.data.mentionsUser, [ 'johndoe' ])
})

ava.test.serial('Users should not be able to login as the core admin user', async (test) => {
	const {
		sdk
	} = test.context

	// First check that the guest user cannot login
	sdk.auth.logout()

	await test.throws(sdk.auth.login({
		username: 'admin'
	}))

	const roles = [
		'user-community',
		'user-team',
		'user-team-admin'
	]

	// Test that each user role cannot login
	for (const role of roles) {
		sdk.auth.logout()

		const userData = {
			username: `${role}-${randomstring.generate()}`,
			email: `${role}-${randomstring.generate()}@example.com`,
			password: 'password'
		}

		const user = await sdk.auth.signup(userData)

		await test.context.jellyfish.insertCard(
			test.context.session,
			_.merge(user, {
				data: {
					roles: [ role ]
				}
			}),
			{
				override: true
			}
		)

		await sdk.auth.login(userData)

		await test.throws(sdk.auth.login({
			username: 'admin'
		}))
	}
})
