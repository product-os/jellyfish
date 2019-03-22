/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const crypto = require('crypto')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const _ = require('lodash')
const randomstring = require('randomstring')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

const createUserDetails = () => {
	return {
		username: randomstring.generate().toLowerCase(),
		email: `${randomstring.generate().toLowerCase()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('The ping endpoint should continuously work', async (test) => {
	const result1 = await test.context.http('GET', '/ping')
	test.is(result1.code, 200)
	test.false(result1.response.error)

	const result2 = await test.context.http('GET', '/ping')
	test.is(result2.code, 200)
	test.false(result2.response.error)

	const result3 = await test.context.http('GET', '/ping')
	test.is(result3.code, 200)
	test.false(result3.response.error)
})

ava.serial('creating a user with the guest user session should fail', async (test) => {
	const userDetails = createUserDetails()
	const username = `user-${userDetails.username.toLowerCase()}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			email: userDetails.email,
			username,
			hash: {
				string: userDetails.password,
				salt: username
			}
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'QueueInvalidAction',
			message: 'No such action: action-create-user'
		}
	})
})

ava.serial('creating a user with the guest user session using action-create-card should fail', async (test) => {
	const username = `user-${createUserDetails().username.toLowerCase()}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user',
		type: 'type',
		action: 'action-create-card',
		arguments: {
			reason: null,
			properties: {
				slug: username,
				type: 'user'
			}
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'QueueInvalidAction',
			message: 'No such action: action-create-card'
		}
	})
})

ava.serial('Users should be able to change their own email addresses', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)

	await sdk.auth.login(userDetails)

	user.data.email = 'test@example.com'

	await test.notThrowsAsync(() => {
		return sdk.card.update(user.id, user)
	})
})

ava.serial('Updating a user should not remove their org membership', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)
	await sdk.auth.login(userDetails)

	const waitQuery = {
		type: 'object',
		$$links: {
			'is member of': {
				type: 'object',
				required: [ 'slug' ],
				properties: {
					slug: {
						type: 'string',
						const: 'org-balena'
					}
				}
			}
		},
		properties: {
			id: {
				type: 'string',
				const: user.id
			},
			type: {
				type: 'string',
				const: 'user'
			}
		},
		required: [ 'id', 'type' ],
		additionalProperties: true
	}

	const balenaOrg = await sdk.card.get('org-balena', {
		type: 'org'
	})

	await test.context.executeThenWait(() => {
		return sdk.card.link(balenaOrg, user, 'has member')
	}, waitQuery)

	const linkedUser = await sdk.auth.whoami()

	user.data.email = 'test@example.com'

	await test.notThrowsAsync(() => {
		return sdk.card.update(user.id, user)
	})

	const updatedUser = await sdk.auth.whoami()

	test.deepEqual(updatedUser.links['is member of'], linkedUser.links['is member of'])
})

ava.serial('Users should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await test.context.createUser(createUserDetails())

	const activeUserDetails = createUserDetails()

	await test.context.createUser(activeUserDetails)
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id, {
		type: 'user'
	})

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('.query() the guest user should only see its own private fields', async (test) => {
	await test.context.createUser({
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
		},
		additionalProperties: true
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

ava.serial('.query() should be able to see previously restricted cards after an org change', async (test) => {
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

	const user = await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	test.truthy(user, 'User should be defined')
	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const orgCard = await jellyfish.getCardBySlug(test.context.context, test.context.session, 'org-balena', {
		type: 'org'
	})

	test.truthy(orgCard, 'Org should exist')
	const entry = await jellyfish.insertCard(test.context.context, test.context.session, {
		markers: [ orgCard.slug ],
		type: 'support-issue',
		slug: test.context.generateRandomSlug({
			prefix: 'support-issue'
		}),
		version: '1.0.0',
		name: 'Test entry'
	})

	test.truthy(entry, 'Entry should be defined')
	const unprivilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.deepEqual(unprivilegedResults, null)

	await jellyfish.insertCard(test.context.context, test.context.session, defaults({
		slug: `link-${orgCard.id}-has-member-${user.id}`,
		type: 'link',
		name: 'has member',
		data: {
			inverseName: 'is member of',
			from: {
				id: orgCard.id,
				type: orgCard.type
			},
			to: {
				id: user.id,
				type: user.type
			}
		}
	}), {
		override: true
	})

	const privilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.truthy(privilegedResults)
	test.deepEqual(privilegedResults.id, entry.id)
})

ava.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	const user = await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const thread = await sdk.card.create({
		type: 'thread'
	})

	// Set up the watcher before the card is updated to stop race conditions from
	// happening
	// Wait for links to be materialized
	const waitQuery = {
		type: 'object',
		additionalProperties: true,
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
			}
		},
		required: [ 'id' ]
	}

	await test.context.executeThenWait(() => {
		return sdk.card.update(thread.id, _.assign(thread, {
			data: {
				description: 'Lorem ipsum dolor sit amet'
			}
		}))
	}, waitQuery)

	const card = await sdk.card.getWithTimeline(thread.id, {
		type: 'thread'
	})
	test.truthy(card)

	const timelineActors = _.uniq(card.links['has attached element'].map((item) => {
		return item.data.actor
	}))

	test.deepEqual(timelineActors, [ user.id ])
})

ava.serial('.query() community users should be able to query views', async (test) => {
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await test.context.createUser({
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

	const targetUser = await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	await test.throwsAsync(sdk.card.update(
		targetUser.id,
		{
			type: 'user',
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

	const targetUser = await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	const communityUsername = randomstring.generate().toLowerCase()
	const communityEmail = `${randomstring.generate()}@example.com`

	await test.context.createUser({
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
			type: 'user',
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
	const userDetails = {
		username: randomstring.generate().toLowerCase(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	// Create a new user
	await test.context.createUser(userDetails)

	// Login as the new user
	await sdk.auth.login(userDetails)

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
				},
				required: [ 'mentionsUser' ]
			}
		},
		required: [ 'type', 'data' ]
	}

	const card = await test.context.executeThenWait(() => {
		return sdk.event.create({
			type: 'message',
			tags: [],
			target: thread,
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

	const userDetails = {
		username: randomstring.generate().toLowerCase(),
		email: `${randomstring.generate()}@example.com`,
		password: 'foobarbaz'
	}

	// Create a new user
	const user = await test.context.createUser(userDetails)

	await sdk.auth.login(userDetails)

	await sdk.card.update(
		user.id,
		_.merge(
			_.omit(user, [ 'data', 'password' ]),
			{
				type: user.type,
				data: {
					email: 'test@example.com'
				}
			}
		)
	)

	const rawUserCard =
		await test.context.jellyfish.getCardById(test.context.context, test.context.session, user.id, {
			type: 'user'
		})

	test.is(rawUserCard.data.email, 'test@example.com')
	test.is(_.has(rawUserCard, [ 'data', 'roles' ]), true)
	test.is(_.has(rawUserCard, [ 'data', 'password', 'hash' ]), true)
})

ava.serial('Users should not be able to login as the core admin user', async (test) => {
	const {
		sdk
	} = test.context

	// First check that the guest user cannot login
	sdk.auth.logout()

	console.log('attempting login')
	await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	const role = 'user-community'

	const userData = createUserDetails()

	const user = await test.context.createUser(userData)

	await test.context.jellyfish.insertCard(test.context.context,
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
})

ava.serial('should not be able to post an unsupported external event', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/test', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

const githubAvaTest = environment.getIntegrationToken('github')
	? ava.serial
	: ava.skip

githubAvaTest('should be able to post a GitHub event without a signature', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/github', {
		foo: 'bar',
		bar: 'baz',
		sender: {
			login: 'johndoe'
		}
	})

	test.is(result.code, 200)
	test.false(result.response.error)

	const requestResult = await test.context.queue.waitResults(
		test.context.context, result.response.data)

	test.false(requestResult.error)
	const card = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, requestResult.data.id, {
			type: 'external-event'
		})

	test.deepEqual(card, {
		created_at: requestResult.data.created_at,
		updated_at: null,
		linked_at: card.linked_at,
		id: requestResult.data.id,
		type: 'external-event',
		name: null,
		slug: requestResult.data.slug,
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: card.links,
		requires: [],
		capabilities: [],
		data: {
			source: 'github',
			headers: {
				accept: 'application/json',
				connection: 'close',
				'content-length': '54',
				'content-type': 'application/json',
				host: `localhost:${test.context.server.port}`
			},
			payload: {
				foo: 'bar',
				bar: 'baz',
				sender: {
					login: 'johndoe'
				}
			}
		}
	})
})

githubAvaTest('should take a GitHub event with a valid signature', async (test) => {
	const object = '{"foo":"bar","sender":{"login":"johndoe"}}'
	const hash = crypto.createHmac('sha1', environment.integration.github.signatureKey)
		.update(object)
		.digest('hex')

	const result = await test.context.http('POST', '/api/v2/hooks/github', JSON.parse(object), {
		'x-hub-signature': `sha1=${hash}`
	})

	test.is(result.code, 200)
	test.false(result.response.error)

	const requestResult = await test.context.queue.waitResults(
		test.context.context, result.response.data)

	test.false(requestResult.error)
	const card = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, requestResult.data.id, {
			type: 'external-event'
		})

	test.deepEqual(card, {
		created_at: requestResult.data.created_at,
		updated_at: null,
		linked_at: card.linked_at,
		id: requestResult.data.id,
		type: 'external-event',
		slug: requestResult.data.slug,
		name: null,
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: card.links,
		requires: [],
		capabilities: [],
		data: {
			source: 'github',
			headers: {
				accept: 'application/json',
				connection: 'close',
				'content-length': '42',
				'content-type': 'application/json',
				host: `localhost:${test.context.server.port}`,
				'x-hub-signature': `sha1=${hash}`
			},
			payload: {
				foo: 'bar',
				sender: {
					login: 'johndoe'
				}
			}
		}
	})
})

ava.serial('should not ignore a GitHub signature mismatch', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/github', {
		foo: 'bar',
		bar: 'baz'
	}, {
		'x-hub-signature': 'sha1=xxxxxxxxxxxxxxx'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

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

	const typeCard = await jellyfish.getCardBySlug(test.context.context,
		test.context.session, 'card', {
			type: 'type'
		})
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const trigger = await jellyfish.insertCard(test.context.context, test.context.session, defaults({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		data: {
			action: 'action-create-card',
			target: typeCard.id,
			targetType: typeCard.type,
			interval: 'PT1S',
			arguments: {
				reason: null,
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
		const results = await test.context.jellyfish.query(test.context.context, test.context.session, {
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
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, trigger, {
		override: true
	})
})

ava.serial('should be able to resolve links', async (test) => {
	const {
		sdk
	} = test.context

	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`

	await test.context.createUser({
		username,
		email,
		password: 'foobarbaz'
	})

	await test.context.sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const id = randomstring.generate()
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		data: {
			uuid: id
		}
	})

	const message = await sdk.event.create({
		type: 'message',
		tags: [],
		target: thread,
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
								const: id
							}
						}
					}
				},
				additionalProperties: false
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
			slug: message.slug,
			type: 'message',
			markers: [],
			links: {
				'is attached to': [
					{
						id: thread.id,
						type: 'thread',
						data: {
							uuid: id
						}
					}
				]
			},
			data: message.data
		}
	])
})

ava.serial('.query() additionalProperties should not affect listing users as a new user', async (test) => {
	const id = uuid()
	const username = randomstring.generate().toLowerCase()
	const email = `${randomstring.generate()}@example.com`
	await test.context.createUser({
		username: randomstring.generate().toLowerCase(),
		email: `${randomstring.generate()}@example.com`,
		password: 'xxxxxxxxx'
	})
	await test.context.createUser({
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
			},
			id: {
				type: 'string',
				const: id
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
			},
			id: {
				type: 'string',
				const: id
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

	await test.context.createUser({
		username: username1,
		email: email1,
		password: 'foobarbaz'
	})

	const username2 = randomstring.generate().toLowerCase()
	const email2 = `${randomstring.generate()}@example.com`

	const targetUser = await test.context.createUser({
		username: username2,
		email: email2,
		password: 'secret'
	})

	await test.context.sdk.auth.login({
		username: username1,
		password: 'foobarbaz'
	})

	const id = randomstring.generate()
	const message = await sdk.event.create({
		type: 'message',
		tags: [],
		target: targetUser,
		payload: {
			message: id
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
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'object',
						required: [ 'message' ],
						properties: {
							message: {
								type: 'string',
								const: id
							}
						}
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
			id: message.id,
			slug: message.slug,
			type: 'message',
			markers: [],
			links: {
				'is attached to': [
					Object.assign({}, targetUser, {
						links: results[0].links['is attached to'][0].links,
						linked_at: results[0].links['is attached to'][0].linked_at,
						data: _.omit(targetUser.data, [ 'password', 'roles' ])
					})
				]
			},
			data: message.data
		}
	])
})

ava.serial('should display up to date information after resolving an action', async (test) => {
	await test.context.sdk.setAuthToken(test.context.session)

	for (const time in _.range(0, 50)) {
		const card = await test.context.sdk.card.create({
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: `card-${time}`
			}),
			version: '1.0.0'
		})

		await test.context.sdk.card.remove(card.id, card.type)
		const result = await test.context.sdk.card.get(card.id, {
			type: 'card'
		})

		test.false(result.active)
	}
})

ava.serial('should fail with a user error given the wrong username during login', async (test) => {
	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user-nonexistentuser12345',
		type: 'user',
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: '1234',
					salt: 'user-nonexistentuser12345'
				}
			}
		}
	})

	test.is(result.code, 400)
	test.true(result.response.error)
	test.is(result.response.data.name, 'AuthenticationError')
})

ava.serial('should fail with a user error when querying an id with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'GET', '/api/v2/id/user/4a962ad9-20b5-4dd8-a707-bf819593cc84', null, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when querying a slug with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'GET', '/api/v2/slug/user/user-admin', null, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when querying with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/query', {
			type: 'object',
			additionalProperties: true,
			required: [ 'slug', 'type' ],
			properties: {
				slug: {
					type: 'string',
					const: 'user-admin'
				},
				type: {
					type: 'string',
					cons: 'user'
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when posting an action with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user-nonexistentuser12345',
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: {
					hash: {
						string: '1234',
						salt: 'user-nonexistentuser12345'
					}
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail when querying an invalid session with an invalid session', async (test) => {
	const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'

	const result = await test.context.http(
		'GET', `/api/v2/id/session/${session}`, null, {
			Authorization: `Bearer ${session}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishInvalidSession',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when executing an unknown action', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user-admin',
			type: 'user',
			action: 'action-foo-bar-baz-qux',
			arguments: {
				foo: 'bar'
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'QueueInvalidAction',
			message: result.response.data.message
		}
	})
})
