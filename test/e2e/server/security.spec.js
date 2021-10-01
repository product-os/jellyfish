/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const _ = require('lodash')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('querying whoami with an invalid session should fail', async (test) => {
	const result = await test.context.http('GET', '/api/v2/whoami', null, {
		Authorization: `Bearer ${uuid()}`
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'JellyfishInvalidSession',
			message: 'Session does not exist'
		}
	})
})

ava.serial('Users should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const activeUserDetails = createUserDetails()

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${activeUserDetails.username}`,
			email: activeUserDetails.email,
			password: activeUserDetails.password
		}
	})
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id, {
		type: 'user'
	})

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

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
						const: 'update@1.0.0'
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

	await test.context.executeThenWait(async () => {
		const result = await test.context.http(
			'POST', '/api/v2/action', {
				card: `${thread.slug}@${thread.version}`,
				type: thread.type,
				action: 'action-update-card@1.0.0',
				arguments: {
					reason: null,
					patch: [
						{
							op: 'add',
							path: '/data/description',
							value: 'Lorem ipsum dolor sit amet'
						}
					]
				}
			}, {
				Authorization: `Bearer ${sdk.getAuthToken()}`
			})

		if (result.code !== 200) {
			throw new Error(`Error code: ${result.code}`)
		}
	}, waitQuery)

	const card = await sdk.card.getWithTimeline(thread.id, {
		type: 'thread@1.0.0'
	})
	test.truthy(card)

	const timelineActors = _.uniq(card.links['has attached element'].map((item) => {
		return item.data.actor
	}))

	test.deepEqual(timelineActors, [ user.id ])
})

ava.serial('Users should not be able to login as the core admin user', async (test) => {
	const {
		sdk
	} = test.context

	// First check that the guest user cannot login
	sdk.auth.logout()

	const error1 = await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	test.is(error1.name, 'WorkerAuthenticationError')

	sdk.setAuthToken(test.context.token)
	const userData = createUserDetails()

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userData.username}`,
			email: userData.email,
			password: userData.password
		}
	})

	await sdk.auth.login(userData)

	const error2 = await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	test.is(error2.name, 'WorkerAuthenticationError')
})

ava.serial('.query() additionalProperties should not affect listing users as a new user', async (test) => {
	const id = uuid()

	const details = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${details.username}`,
			email: details.email,
			password: details.password
		}
	})

	const userDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})
	await test.context.sdk.auth.login(userDetails)
	const results1 = await test.context.sdk.query({
		type: 'object',
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user@1.0.0'
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
				const: 'user@1.0.0'
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

	const user1Details = createUserDetails()
	const targetDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${user1Details.username}`,
			email: user1Details.email,
			password: user1Details.password
		}
	})
	const targetUserInfo = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${targetDetails.username}`,
			email: targetDetails.email,
			password: targetDetails.password
		}
	})
	const targetUser = await test.context.sdk.card.get(targetUserInfo.id)

	await test.context.sdk.auth.login(user1Details)

	const id = uuid()

	await sdk.event.create({
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
						const: 'user@1.0.0'
					}
				}
			}
		},
		type: 'object',
		required: [ 'id', 'type', 'links', 'data', 'slug' ],
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'message@1.0.0'
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

	const linkedUser = results[0].links['is attached to'][0]

	test.falsy(linkedUser.data.hash)
	test.falsy(linkedUser.data.roles)
	test.falsy(linkedUser.data.profile)
})

ava.serial('Users should not be able to view create cards that create users', async (test) => {
	const {
		sdk
	} = test.context

	const user1Details = createUserDetails()
	const user2Details = createUserDetails()

	await sdk.auth.signup(user1Details)
	const user2 = await sdk.auth.signup(user2Details)

	await sdk.auth.login(user1Details)

	// The create event for user 2 should not be visible to user 1
	const results = await sdk.query({
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: user2.id
					}
				}
			}
		},
		type: 'object',
		properties: {
			type: {
				const: 'create@1.0.0'
			}
		}
	})

	test.is(results.length, 0)
})
