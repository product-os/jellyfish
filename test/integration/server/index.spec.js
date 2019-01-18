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
const crypto = require('crypto')
const Bluebird = require('bluebird')
const _ = require('lodash')
const randomstring = require('randomstring')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

const createUserDetails = () => {
	return {
		username: randomstring.generate(),
		email: `${randomstring.generate()}@example.com`,
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

ava.serial('The status endpoint should return numeric queue lengths', async (test) => {
	const result = await test.context.http('GET', '/status')
	test.is(result.code, 200)
	test.true(_.every(result.response.workers, (worker) => {
		return _.isNumber(worker.queue)
	}))
})

ava.serial('Users should be able to change their own email addresses', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await sdk.auth.signup(userDetails)
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
	const user = await sdk.auth.signup(userDetails)
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

	const targetUser = await sdk.auth.signup(createUserDetails())

	const activeUserDetails = createUserDetails()

	await sdk.auth.signup(activeUserDetails)
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id, {
		type: 'user'
	})

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

	const user = await sdk.auth.signup({
		username,
		email,
		password: 'foobarbaz'
	})

	await sdk.auth.login({
		username,
		password: 'foobarbaz'
	})

	const orgCard = await jellyfish.getCardBySlug(test.context.context, test.context.session, 'org-balena', {
		type: 'org'
	})

	const entry = await jellyfish.insertCard(test.context.context, test.context.session, {
		markers: [ orgCard.slug ],
		type: 'support-issue',
		slug: test.context.generateRandomSlug({
			prefix: 'support-issue'
		}),
		version: '1.0.0',
		name: 'Test entry'
	})

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
		type: 'thread'
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
	await sdk.auth.signup(userDetails)

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
				}
			}
		}
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
	const user = await sdk.auth.signup(userDetails)

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

	await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	const role = 'user-community'

	sdk.auth.logout()

	const userData = {
		username: `${role}-${randomstring.generate()}`,
		email: `${role}-${randomstring.generate()}@example.com`,
		password: 'password'
	}

	const user = await sdk.auth.signup(userData)

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

ava.serial('should be able to post a GitHub event without a signature', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/github', {
		foo: 'bar',
		bar: 'baz'
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
			source: 'github',
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

ava.serial('should take a GitHub event with a valid signature', async (test) => {
	const object = '{"foo":"bar"}'
	const hash = crypto.createHmac('sha1', process.env.INTEGRATION_GITHUB_SIGNATURE_KEY)
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
			source: 'github',
			headers: {
				accept: 'application/json',
				connection: 'close',
				'content-length': '13',
				'content-type': 'application/json',
				host: `localhost:${test.context.server.port}`,
				'x-hub-signature': `sha1=${hash}`
			},
			payload: {
				foo: 'bar'
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

	await sdk.auth.signup({
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
								const: uuid
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
			},
			id: {
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
			},
			id: {
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
	const message = await sdk.event.create({
		type: 'message',
		tags: [],
		target: targetUser,
		payload: {
			message: uuid
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
								const: uuid
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
						data: _.omit(targetUser.data, [ 'password', 'roles' ])
					})
				]
			},
			data: message.data
		}
	])
})
