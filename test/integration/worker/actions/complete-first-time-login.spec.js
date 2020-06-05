/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')
const uuid = require('../../../../lib/uuid')
const environment = require('../../../../lib/environment')

const MAILGUN = environment.mail

const createOrgLinkAction = async ({
	fromId,
	toId,
	context
}) => {
	return {
		action: 'action-create-card@1.0.0',
		context,
		card: 'link',
		type: 'type',
		arguments: {
			reason: 'for testing',
			properties: {
				slug: `link-${fromId}-has-member-${toId}-${await uuid.random()}`,
				version: '1.0.0',
				name: 'has member',
				data: {
					inverseName: 'is member of',
					to: {
						id: toId,
						type: 'user@1.0.0'
					},
					from: {
						id: fromId,
						type: 'org@1.0.0'
					}
				}
			}
		}
	}
}

// Create new user and link to test org
const createUser = async (test, withPassword) => {
	let user
	if (withPassword) {
		const createUserAction = await test.context.worker.pre(test.context.session, {
			action: 'action-create-user@1.0.0',
			context: test.context.context,
			card: test.context.userCard.id,
			type: test.context.userCard.type,
			arguments: {
				email: 'test@test.com',
				password: 'a-very-dumb-password',
				username: test.context.generateRandomSlug({
					prefix: 'user'
				})
			}
		})
		user = await test.context.processAction(test.context.session, createUserAction)
	} else {
		user = await test.context.processAction(test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: test.context.userCard.id,
			type: test.context.userCard.type,
			arguments: {
				reason: 'for testing',
				properties: {
					slug: test.context.generateRandomSlug({
						prefix: 'user'
					}),
					data: {
						email: 'test@test.com',
						hash: 'PASSWORDLESS',
						roles: [ 'user-community' ]
					}
				}
			}
		})
	}

	// Link new user to test org
	const userOrgLinkAction = await createOrgLinkAction({
		toId: user.data.id,
		fromId: test.context.org.data.id,
		context: test.context.context
	})
	await test.context.processAction(test.context.session, userOrgLinkAction)

	return user
}

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
	const {
		session,
		jellyfish,
		context,
		processAction
	} = test.context

	nock(`${MAILGUN.baseUrl}/${MAILGUN.domain}`)
		.persist()
		.post('/messages')
		.basicAuth({
			user: 'api',
			pass: MAILGUN.TOKEN
		})
		.reply(200)

	const orgCard = await jellyfish.getCardBySlug(context, session, 'org@latest')
	test.context.userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	test.context.org = await processAction(session, {
		action: 'action-create-card@1.0.0',
		context,
		card: orgCard.id,
		type: orgCard.type,
		arguments: {
			reason: 'for testing',
			properties: {
				name: 'foobar'
			}
		}
	})

	// Get admin user and link to org
	const adminUser = await jellyfish.getCardBySlug(context, session, 'user-admin@1.0.0')
	const adminOrgLinkAction = await createOrgLinkAction({
		toId: adminUser.id,
		fromId: test.context.org.data.id,
		context
	})
	await processAction(session, adminOrgLinkAction)
})

ava.after(helpers.worker.after)

ava('should update the user\'s password when the firstTimeLoginToken is valid', async (test) => {
	const {
		session,
		context,
		processAction,
		jellyfish,
		worker
	} = test.context

	const user = await createUser(test, false)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		}
	})

	const newPassword = 'newPassword'

	const completeFirstTimeLoginAction = await worker.pre(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword
		}
	})

	await processAction(session, completeFirstTimeLoginAction)

	await test.throwsAsync(worker.pre(session, {
		action: 'action-create-session@1.0.0',
		card: user.data.id,
		type: user.data.type,
		context,
		arguments: {
			password: 'PASSWORDLESS'
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'Invalid password'
	})

	const newPasswordLoginRequest = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			password: newPassword
		}
	})

	const newPasswordLoginResult = await processAction(session, newPasswordLoginRequest)
	test.false(newPasswordLoginResult.error)
})

ava('should fail when the first-time login does not match a valid card', async (test) => {
	const {
		session,
		context,
		worker,
		processAction
	} = test.context

	const user = await createUser(test, false)

	const fakeToken = await uuid.random()

	await test.throwsAsync(processAction(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: fakeToken,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'First-time login token invalid'
	})
})

ava('should fail when the first-time login token has expired', async (test) => {
	const {
		jellyfish,
		session,
		context,
		worker,
		processAction
	} = test.context

	const user = await createUser(test, false)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: user.data.id
					}
				}
			}
		}
	})

	const now = new Date()
	const hourInPast = now.setHours(now.getHours() - 1)
	const newExpiry = new Date(hourInPast)

	await processAction(session, {
		action: 'action-update-card@1.0.0',
		context,
		card: firstTimeLogin.id,
		type: firstTimeLogin.type,
		arguments: {
			reason: 'Expiring for test',
			patch: [
				{
					op: 'replace',
					path: '/data/expiresAt',
					value: newExpiry.toISOString()
				}
			]
		}
	})

	await test.throwsAsync(processAction(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'First-time login token has expired'
	})
})

ava('should fail when the first-time login is not active', async (test) => {
	const {
		jellyfish,
		session,
		context,
		worker,
		processAction
	} = test.context
	const user = await createUser(test, false)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		}
	})

	await processAction(session, {
		action: 'action-delete-card@1.0.0',
		context,
		card: firstTimeLogin.id,
		type: firstTimeLogin.type,
		arguments: {}
	})

	await test.throwsAsync(processAction(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'First-time login token invalid'
	})
})

ava('should fail if the user becomes inactive between requesting and completing the first-time login', async (test) => {
	const {
		session,
		context,
		processAction,
		worker,
		jellyfish
	} = test.context
	const user = await createUser(test, false)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username: user.data.slug
		}
	})

	await processAction(session, {
		action: 'action-delete-card@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		}
	})

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword: 'new-password'
		}
	})

	await test.throwsAsync(processAction(session, completePasswordReset), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'First-time login token invalid'
	})
})

ava('should invalidate the first-time-login card', async (test) => {
	const {
		session,
		context,
		processAction,
		worker,
		jellyfish
	} = test.context
	const user = await createUser(test, false)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: user.data.id
					}
				}
			}
		}
	})

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword: 'new-password'
		}
	})

	await processAction(session, completePasswordReset)

	const [ updatedFirstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type', 'active' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			},
			active: {
				type: 'boolean'
			}
		}
	}, {
		limit: 1
	})

	test.false(updatedFirstTimeLogin.active)
})

ava('should throw an error when the user already has a password set', async (test) => {
	const {
		session,
		context,
		processAction,
		worker,
		jellyfish
	} = test.context
	const user = await createUser(test, true)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: user.data.id
					}
				}
			}
		}
	})

	await test.throwsAsync(processAction(session, {
		action: 'action-complete-first-time-login@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			firstTimeLoginToken: firstTimeLogin.data.firstTimeLoginToken,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'User already has a password set'
	})
})
