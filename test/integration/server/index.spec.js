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
const Bluebird = require('bluebird')
const _ = require('lodash')
const randomstring = require('randomstring')
const helpers = require('../sdk/helpers')
const queue = require('../../../lib/queue')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

ava.serial('Users should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await sdk.auth.signup({
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	})

	const activeUserDetails = {
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	await sdk.auth.signup(activeUserDetails)
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id)

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('Users with the role "team" should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await sdk.auth.signup({
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	})

	const activeUserDetails = {
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	const activeUser = await sdk.auth.signup(activeUserDetails)

	// Update the role on the admin user
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(activeUser, {
			data: {
				roles: [ 'user-team' ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id)

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('Users with the role "team-admin" should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await sdk.auth.signup({
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	})

	const activeUserDetails = {
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	const activeUser = await sdk.auth.signup(activeUserDetails)

	// Update the role on the admin user
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(activeUser, {
			data: {
				roles: [ 'user-team-admin' ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id)

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('.query() the guest user should only see its own private fields', async (test) => {
	await test.context.sdk.auth.signup({
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	})
	await test.context.sdk.auth.logout()
	const results = await test.context.sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				}
			}
		}
	})

	_.map(results, (user) => {
		test.false(user.slug === 'user-admin')
		if (user.slug === 'user-guest') {
			// The "guest-user" should be fetched with all fields
			test.is(user.data.email, 'accounts+jellyfish@resin.io')
		} else {
			// The other users would only have non-private fields
			test.is(user.data, undefined)
		}
	})
})

ava.serial('Users with multiple roles should see cards accessible to either role', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = {
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	const user = await sdk.auth.signup(userDetails)

	// Update the role on the team user
	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(user, {
			data: {
				roles: [ 'user-community', 'user-team' ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login(userDetails)

	const scratchpad = await sdk.card.get('view-scratchpad')

	test.not(scratchpad, null)
})

ava.serial('.query() should be able to see previously restricted cards after a permissions change', async (test) => {
	const {
		sdk
	} = test.context

	const {
		jellyfish
	} = test.context.server
	const {
		defaults
	} = jellyfish

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const entry = await jellyfish.insertCard(test.context.session, defaults({
		type: 'scratchpad-entry',
		slug: test.context.generateRandomSlug({
			prefix: 'scratchpad-entry'
		}),
		version: '1.0.0',
		name: 'Test entry'
	}))

	const unprivilegedResults = await sdk.card.get(entry.id)

	test.deepEqual(unprivilegedResults, null)

	await jellyfish.insertCard(test.context.session, defaults({
		id: user.id,
		slug: `user-${username}`,
		type: 'user',
		version: '1.0.0',
		data: {
			email,
			roles: [ 'user-team' ]
		}
	}), {
		override: true
	})

	const privilegedResults = await sdk.card.get(entry.id)
	test.deepEqual(privilegedResults.id, entry.id)
})

ava.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const thread = await sdk.card.create({
		type: 'thread',
		links: {},
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0'
	})

	// Set up the watcher before the card is updated to stop race conditions from
	// happening
	// Wait for links to be materialized
	const waitQuery = {
		type: 'object',
		$$links: {
			'has attached element': {
				type: 'object',
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: 'update'
					}
				}
			}
		},
		properties: {
			id: {
				type: 'string',
				const: thread.id
			},
			links: {
				type: 'object',
				properties: {
					'has attached element': {
						type: 'array'
					}
				},
				required: [ 'has attached element' ]
			}
		},
		required: [ 'id', 'links' ]
	}

	await test.context.executeThenWait(() => {
		return sdk.card.update(thread.id, _.assign(thread, {
			data: {
				description: 'Lorem ipsum dolor sit amer'
			}
		}))
	}, waitQuery)

	const card = await sdk.card.getWithTimeline(thread.id)
	test.truthy(card)

	const timelineActors = _.uniq(card.links['has attached element'].map((item) => {
		return item.data.actor
	}))

	test.deepEqual(timelineActors, [ user.id ])
})

ava.serial('.query() community users should be able to query views', async (test) => {
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await test.context.sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await test.context.sdk.auth.login({
		username,
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

ava.serial('the guest user should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const targetUser = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await test.throwsAsync(sdk.card.update(
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

ava.serial('users with the "user-community" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const targetUser = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	const communityUsername = randomstring.generate().toLowerCase()
	const communityEmail = `${randomstring.generate()}@example.com`

	await sdk.auth.signup({
		username: communityUsername,
		email: communityEmail,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username: communityUsername,
		password: 'foobarbaz'
	})

	await test.throwsAsync(sdk.card.update(
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

ava.serial('users with the "user-team" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const role = 'user-team'
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const targetUser = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	const teamUsername = randomstring.generate().toLowerCase()
	const teamEmail = `${randomstring.generate()}@example.com`

	const teamUser = await sdk.auth.signup({
		username: teamUsername,
		email: teamEmail,
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
		username: teamUsername,
		password: 'foobarbaz'
	})

	await test.throwsAsync(sdk.card.update(
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

ava.serial('AGGREGATE($events): should work when creating cards via the SDK', async (test) => {
	const {
		sdk
	} = test.context

	const id = 'ba1af3bb-1f8b-4943-ae0f-8e5bd39cf48b'
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	// Create a new user
	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	// Sign in as the admin
	await sdk.setAuthToken(test.context.session)

	// Update the user's permissions
	await sdk.card.update(user.id, _.assign(user, {
		data: {
			roles: [ 'user-team' ]
		}
	}))

	// Login as the new user
	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	// Create a new thread element
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		name: 'test-thread',
		data: {}
	})

	const waitQuery = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'thread'
			},
			data: {
				type: 'object',
				properties: {
					mentionsUser: {
						type: 'array',
						contains: {
							type: 'string',
							const: id
						}
					}
				}
			}
		}
	}

	const card = await test.context.executeThenWait(() => {
		return sdk.event.create({
			type: 'message',
			tags: [],
			card: thread.id,
			payload: {
				message: 'lorem ipsum dolor sit amet',
				mentionsUser: [ id ]
			}
		})
	}, waitQuery)

	test.deepEqual(card.data.mentionsUser, [ id ])
})

ava.serial('When updating a user, inaccessible fields should not be removed', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	// Create a new user
	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	const teamUsername = randomstring.generate().toLowerCase()
	const teamEmail = `${randomstring.generate()}@example.com`

	const teamAdminUserData = {
		username: teamUsername,
		email: teamEmail,
		password: 'password'
	}

	const teamAdminUser = await sdk.auth.signup(teamAdminUserData)

	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(teamAdminUser, {
			data: {
				roles: [ 'user-team-admin' ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login(teamAdminUserData)

	const userCard = await sdk.card.get(user.id)

	await sdk.card.update(
		userCard.id,
		_.merge(
			_.omit(userCard, [ 'data', 'password' ]),
			{
				data: {
					roles: [ 'user-team' ]
				}
			}
		)
	)

	const rawUserCard = await test.context.jellyfish.getCardById(test.context.session, user.id)

	test.is(_.has(rawUserCard, [ 'data', 'email' ]), true)
	test.is(_.has(rawUserCard, [ 'data', 'roles' ]), true)
	test.is(_.has(rawUserCard, [ 'data', 'password', 'hash' ]), true)
})

ava.serial('A team admin user should be able to update another user\'s roles', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	// Create a new user
	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	const teamUsername = randomstring.generate().toLowerCase()
	const teamEmail = `${randomstring.generate()}@example.com`

	const teamAdminUserData = {
		username: teamUsername,
		email: teamEmail,
		password: 'password'
	}

	const teamAdminUser = await sdk.auth.signup(teamAdminUserData)

	await test.context.jellyfish.insertCard(
		test.context.session,
		_.merge(teamAdminUser, {
			data: {
				roles: [ 'user-team-admin' ]
			}
		}),
		{
			override: true
		}
	)

	await sdk.auth.login(teamAdminUserData)

	await sdk.card.update(
		user.id,
		_.merge(
			_.omit(user, [ 'data', 'password' ]),
			{
				data: {
					roles: [ 'user-team' ]
				}
			}
		)
	)

	const userCard = await test.context.jellyfish.getCardById(test.context.session, user.id)

	test.deepEqual(userCard.data.roles, [ 'user-team' ])
})

ava.serial('Users should not be able to login as the core admin user', async (test) => {
	const {
		sdk
	} = test.context

	// First check that the guest user cannot login
	sdk.auth.logout()

	await test.throwsAsync(sdk.auth.login({
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

		await test.throwsAsync(sdk.auth.login({
			username: 'admin'
		}))
	}
})

if (process.env.NODE_ENV === 'production') {
	ava.serial('should reject an external event from localhost', async (test) => {
		const result = await test.context.http('POST', '/api/v2/hooks/test', {
			foo: 'bar',
			bar: 'baz'
		})

		test.is(result.code, 401)
		test.true(result.response.error)
	})

	ava.serial('should be able to reject an external event with a type coming from localhost', async (test) => {
		const result = await test.context.http('POST', '/api/v2/hooks/test/foobarbaz', {
			foo: 'bar',
			bar: 'baz'
		})

		test.is(result.code, 401)
		test.true(result.response.error)
	})
} else {
	ava.serial('should be able to post an external event', async (test) => {
		const result = await test.context.http('POST', '/api/v2/hooks/test', {
			foo: 'bar',
			bar: 'baz'
		})

		test.is(result.code, 200)
		test.false(result.response.error)

		const requestResult = await queue.waitResults(
			test.context.jellyfish, test.context.session, result.response.data)

		test.false(requestResult.error)
		const card = await test.context.jellyfish.getCardById(test.context.session, requestResult.data.id)

		test.deepEqual(card, {
			id: requestResult.data.id,
			type: 'external-event',
			slug: requestResult.data.slug,
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: card.links,
			requires: [],
			capabilities: [],
			data: {
				source: 'test',
				headers: {
					accept: 'application/json',
					connection: 'close',
					'content-length': '25',
					'content-type': 'application/json',
					host: `localhost:${test.context.server.port}`
				},
				payload: {
					foo: 'bar',
					bar: 'baz'
				}
			}
		})
	})

	ava.serial('should be able to post an external event with a type', async (test) => {
		const result = await test.context.http('POST', '/api/v2/hooks/test/foobarbaz', {
			foo: 'bar',
			bar: 'baz'
		})

		test.is(result.code, 200)
		test.false(result.response.error)

		const requestResult = await queue.waitResults(
			test.context.jellyfish, test.context.session, result.response.data)

		test.false(requestResult.error)
		const card = await test.context.jellyfish.getCardById(test.context.session, requestResult.data.id)

		test.deepEqual(card, {
			id: requestResult.data.id,
			type: 'external-event',
			slug: requestResult.data.slug,
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: card.links,
			requires: [],
			capabilities: [],
			data: {
				source: 'test',
				headers: {
					accept: 'application/json',
					connection: 'close',
					'content-length': '25',
					'content-type': 'application/json',
					host: `localhost:${test.context.server.port}`
				},
				payload: {
					foo: 'bar',
					bar: 'baz'
				}
			}
		})
	})
}

ava.serial('should add and evaluate a time triggered action', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server
	const {
		defaults
	} = jellyfish

	const typeCard = await jellyfish.getCardBySlug(test.context.session, 'card')
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const trigger = await jellyfish.insertCard(test.context.session, defaults({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		data: {
			action: 'action-create-card',
			target: typeCard.id,
			interval: 'PT1S',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: {
						$eval: 'str(epoch)'
					},
					data: {
						origin: 'time-trigger'
					}
				}
			}
		}
	}), {
		override: true
	})

	const waitUntilResults = async (length, times = 0) => {
		const results = await test.context.jellyfish.query(test.context.session, {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'card'
				},
				data: {
					type: 'object',
					required: [ 'origin' ],
					properties: {
						origin: {
							type: 'string'
						}
					}
				}
			}
		})

		if (results.length >= length) {
			return results
		}

		if (times > 100) {
			throw new Error(`Did not get ${length} results in time`)
		}

		await Bluebird.delay(100)
		return waitUntilResults(length, times + 1)
	}

	const results = await waitUntilResults(3)
	test.true(results.length >= 3)

	trigger.active = false
	await test.context.jellyfish.insertCard(test.context.session, trigger, {
		override: true
	})
})

ava.serial('should be able to resolve links', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await test.context.sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await test.context.sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const uuid = randomstring.generate()
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		data: {
			uuid
		}
	})

	const message = await sdk.event.create({
		type: 'message',
		tags: [],
		card: thread.id,
		payload: {
			message: 'lorem ipsum dolor sit amet',
			mentionsUser: []
		}
	})

	const results = await sdk.query({
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'type', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'thread'
					},
					data: {
						additionalProperties: true,
						required: [ 'uuid' ],
						properties: {
							uuid: {
								type: 'string',
								const: uuid
							}
						}
					}
				}
			}
		},
		type: 'object',
		required: [ 'type', 'links' ],
		properties: {
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object'
			},
			slug: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: message.id,
			slug: message.slug,
			type: 'message',
			active: true,
			markers: [],
			links: {
				'is attached to': [
					{
						id: thread.id,
						$link: results[0].links['is attached to'][0].$link,
						type: 'thread',
						data: {
							uuid
						}
					}
				]
			},
			data: message.data
		}
	])
})

ava.serial('.query() additionalProperties should not affect listing users as a new user', async (test) => {
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`
	await test.context.sdk.auth.signup({
		username: randomstring.generate().toLowerCase(),
		email: `${randomstring.generate()}@example.com`,
		password: 'xxxxxxxxx'
	})
	await test.context.sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})
	await test.context.sdk.auth.login({
		username,
		password: 'foobarbaz'
	})
	const results1 = await test.context.sdk.query({
		type: 'object',
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	const results2 = await test.context.sdk.query({
		type: 'object',
		additionalProperties: true,
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	test.deepEqual(_.map(results1, 'id'), _.map(results2, 'id'))
})

ava.serial('should apply permissions on resolved links', async (test) => {
	const {
		sdk
	} = test.context

	const username1 = randomstring.generate().toLowerCase()
	const email1 = `${randomstring.generate()}@example.com`

	await test.context.sdk.auth.signup({
		username: username1,
		email: email1,
		password: 'foobarbaz'
	})

	const username2 = randomstring.generate().toLowerCase()
	const email2 = `${randomstring.generate()}@example.com`

	const targetUser = await test.context.sdk.auth.signup({
		username: username2,
		email: email2,
		password: 'secret'
	})

	await test.context.sdk.auth.login({
		username: username1,
		password: 'foobarbaz'
	})

	const uuid = randomstring.generate()

	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		data: {
			uuid,
			target: targetUser.id
		}
	})

	const results = await sdk.query({
		$$links: {
			'is attached to': {
				type: 'object',
				additionalProperties: true,
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				}
			}
		},
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'thread'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				required: [ 'uuid' ],
				properties: {
					uuid: {
						type: 'string',
						const: uuid
					}
				},
				additionalProperties: true
			},
			slug: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: thread.id,
			slug: thread.slug,
			type: 'thread',
			active: true,
			markers: [],
			links: {
				'is attached to': [
					Object.assign({}, targetUser, {
						$link: results[0].links['is attached to'][0].$link,
						data: _.omit(targetUser.data, [ 'password', 'roles' ])
					})
				]
			},
			data: thread.data
		}
	])
})
