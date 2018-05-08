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

ava.test('.query() should only return the user itself for the guest user', async (test) => {
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

ava.test('.query() should be able to see previously restricted cards after a permissions change', async (test) => {
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

ava.test('timeline cards should reference the correct actor', async (test) => {
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
		type: 'chat-thread',
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
