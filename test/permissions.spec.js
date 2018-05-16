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
	jellyfishSdk
} = require('../lib/sdk')
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
	test.context.sdk = jellyfishSdk({
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

	const userId = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const repoId = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'repo',
		name: 'Test repo',
		tags: [],
		links: [],
		active: true,
		data: {}
	})

	const unprivilegedResults = await sdk.card.get(repoId)

	test.deepEqual(unprivilegedResults, null)

	await test.context.jellyfish.insertCard(test.context.session, {
		id: userId,
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

	const privilegedResults = await sdk.card.get(repoId)
	test.deepEqual(privilegedResults.id, repoId)
})

ava.test.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context

	const userId = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const threadId = await sdk.card.create({
		type: 'thread',
		data: {}
	})

	await sdk.card.update(threadId, {
		data: {
			description: 'Lorem ipsum dolor sit amer'
		}
	})

	const timeline = await sdk.card.getTimeline(threadId)

	const timelineActors = _.uniq(timeline.map((card) => {
		return card.data.actor
	}))

	test.deepEqual(timelineActors, [ userId ])
})

ava.test.serial.only('users should not be able to see the timeline of a head card they cannot view', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	const teamUserId = await sdk.auth.signup({
		username: 'teamuser',
		email: 'teamuser@example.com',
		password: 'foobarbaz'
	})

	// Update the role on the user
	const teamUserCard = await test.context.jellyfish.getCardById(test.context.session, teamUserId)
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(teamUserCard, {
			data: {
				roles: [ 'user-team' ]
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

	const repoId = await sdk.card.create({
		type: 'repo',
		name: 'test repo',
		data: {}
	})

	await sdk.card.create({
		type: 'message',
		data: {
			timestamp: '2018-05-07T10:16:57.902Z',
			target: repoId,
			actor: teamUserId,
			payload: {
				message: 'test message'
			}
		}
	})

	const privilegedResults = await sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'message'
			}
		}
	})

	test.is(privilegedResults.length, 1)

	sdk.auth.logout()

	// Login as the community user, who doesn't have permission to view 'repo'
	// cards
	await sdk.auth.login({
		username: 'johndoe',
		password: 'foobarbaz'
	})

	const results = await sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'message'
			}
		}
	})

	test.is(results.length, 0)
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

	const targetUserId = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	await test.throws(sdk.card.update(
		targetUserId,
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

	const targetUserId = await sdk.auth.signup({
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
		targetUserId,
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

	const targetUserId = await sdk.auth.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	})

	const teamUserId = await sdk.auth.signup({
		username: 'teamuser',
		email: 'teamuser@example.com',
		password: 'foobarbaz'
	})

	// Update the role on the community user
	const teamUserCard = await test.context.jellyfish.getCardById(test.context.session, teamUserId)
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(teamUserCard, {
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
		targetUserId,
		{
			data: {
				password: {
					hash: '6dafdadfffffffaaaaa'
				}
			}
		}
	))
})
