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

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
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

	const userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	const user = await processAction(session, {
		action: 'action-create-card@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			reason: 'for testing',
			properties: {
				slug: 'user-johndoe',
				data: {
					email: 'test@test.com',
					hash: 'PASSWORDLESS',
					roles: [ 'user-community' ]
				}
			}
		}
	})

	// Creates org
	const orgCard = await jellyfish.getCardBySlug(context, session, 'org@latest')

	const org = await processAction(session, {
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

	// Links user to org
	const userOrgLinkAction = await createOrgLinkAction({
		toId: user.data.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, userOrgLinkAction)

	// Gets admin user and links org to it
	const adminUser = await jellyfish.getCardBySlug(context, session, 'user-admin@1.0.0')

	const adminOrgLinkAction = await createOrgLinkAction({
		toId: adminUser.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, adminOrgLinkAction)

	test.context = {
		...test.context,
		user,
		org,
		processAction,
		userCard
	}
})

ava.afterEach(helpers.worker.afterEach)

ava('should update the user\'s password when the firstTimeLoginToken is valid', async (test) => {
	const {
		session,
		context,
		processAction,
		jellyfish,
		user,
		worker
	} = test.context

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
		processAction,
		user
	} = test.context

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
		processAction,
		user
	} = test.context

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
		processAction,
		user
	} = test.context

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
		user,
		username,
		worker,
		jellyfish
	} = test.context

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
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
		user,
		worker,
		jellyfish
	} = test.context

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
		jellyfish,
		userCard,
		org
	} = test.context

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'test@test.com',
			password: 'a-very-dumb-password',
			username: 'user-janedoe'
		}
	})

	const user = await processAction(session, createUserAction)

	const orgLinkAction = await createOrgLinkAction({
		toId: user.data.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, orgLinkAction)

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
