/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const helpers = require('../helpers')
const uuid = require('../../../../lib/uuid')
const actionLibrary = require('../../../../lib/action-library')
const environment = require('../../../../lib/environment')

const MAILGUN = environment.mail

const checkForKeyValue = (key, value, text) => {
	const pattern = new RegExp(`name="${key}"\\s*${value}`, 'm')
	const regex = text.search(pattern)
	return regex !== -1
}

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
		worker,
		session,
		context,
		jellyfish,
		processAction
	} = test.context

	const nockRequest = (fn) => {
		nock(`${MAILGUN.baseUrl}/${MAILGUN.domain}`)
			.persist()
			.post('/messages')
			.basicAuth({
				user: 'api',
				pass: MAILGUN.TOKEN
			})
			.reply(200, (uri, sendBody) => {
				fn ? fn(sendBody) : null
			})
	}

	const userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	const userEmail = 'test@test.com'
	const username = 'johndoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			username: `user-${username}`,
			password: 'foobarbaz',
			email: userEmail
		}
	})

	const user = await processAction(session, createUserAction)

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

	const adminOrgLink = await processAction(session, adminOrgLinkAction)

	test.context = {
		...test.context,
		user,
		userEmail,
		username,
		userCard,
		orgCard,
		org,
		adminOrgLink,
		nockRequest
	}
})

ava.afterEach(async (test) => {
	nock.cleanAll()
	await helpers.worker.afterEach(test)
})

ava('should create a first-time login card and user link for a user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		nockRequest
	} = test.context

	nockRequest()

	const sendFirstTimeLogin = await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})
	test.false(sendFirstTimeLogin.error)

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
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
	}, {
		limit: 1
	})

	test.true(firstTimeLogin !== undefined)
	test.true(new Date(firstTimeLogin.data.expiresAt) > new Date())
	test.is(firstTimeLogin.links['is attached to'].id, user.id)
})

ava('should send a first-time-login email to a user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		userEmail,
		username,
		nockRequest
	} = test.context

	let mailBody
	const saveBody = (body) => {
		mailBody = body
	}

	nockRequest(saveBody)

	const sendFirstTimeLoginAction = {
		action: 'action-send-first-time-login-link@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	}

	const sendFirstTimeLogin = await processAction(session, sendFirstTimeLoginAction)
	test.false(sendFirstTimeLogin.error)

	const [ firstTimeLogin ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type', 'data' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			},
			data: {
				type: 'object',
				properties: {
					firstTimeLoginToken: {
						type: 'string'
					}
				}
			}
		}
	}, {
		limit: 1
	})

	const firstTimeLoginUrl = `https://jel.ly.fish/first_time_login/${firstTimeLogin.data.firstTimeLoginToken}/${username}`

	const expectedEmailBody = `<p>Hello,</p><p>Here is a link to login to your new Jellyfish account ${username}.</p><p>Please use the link below to set your password and login:</p><a href="${firstTimeLoginUrl}">${firstTimeLoginUrl}</a><p>Cheers</p><p>Jellyfish Team</p><a href="https://jel.ly.fish">https://jel.ly.fish</a>`

	const fromIsInBody = checkForKeyValue('from', 'no-reply@mail.ly.fish', mailBody)
	const toIsInBody = checkForKeyValue('to', userEmail, mailBody)
	const subjectIsInBody = checkForKeyValue('subject', 'Jellyfish First Time Login', mailBody)
	const htmlIsInBody = checkForKeyValue('html', expectedEmailBody, mailBody)

	test.true(toIsInBody)
	test.true(fromIsInBody)
	test.true(subjectIsInBody)
	test.true(htmlIsInBody)
})

ava('should throw error if the user is inactive', async (test) => {
	const {
		context,
		processAction,
		user,
		session,
		username,
		nockRequest,
		worker
	} = test.context

	nockRequest()

	const requestDelete = await processAction(session, {
		action: 'action-delete-card@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})
	test.false(requestDelete.error)

	const sendFirstTimeLoginAction = {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	}

	await test.throwsAsync(processAction(session, sendFirstTimeLoginAction), {
		instanceOf: worker.errors.WorkerNoElement,
		message: `User with slug user-${username} is not active`
	})
})

ava('should invalidate previous first-time logins', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		nockRequest
	} = test.context

	nockRequest()

	const sendFirstTimeLoginAction = {
		action: 'action-send-first-time-login-link@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	}

	const firstPasswordResetRequest = await processAction(session, sendFirstTimeLoginAction)
	test.false(firstPasswordResetRequest.error)

	const secondPasswordResetRequest = await processAction(session, sendFirstTimeLoginAction)
	test.false(secondPasswordResetRequest.error)

	const firstTimeLogins = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
			}
		}
	}, {
		sortBy: 'created_at'
	})

	test.is(firstTimeLogins.length, 2)
	test.is(firstTimeLogins[0].active, false)
	test.is(firstTimeLogins[1].active, true)
})

ava('should not invalidate previous first-time logins from other users', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		userCard,
		org,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	const otherUsername = 'janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'other@user.com',
			username: `user-${otherUsername}`,
			password: 'apassword'
		}
	})

	const otherUser = await processAction(session, createUserAction)
	test.false(otherUser.error)

	const linkAction = await createOrgLinkAction({
		toId: otherUser.data.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, linkAction)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context: test.context.context,
		card: otherUser.data.id,
		type: otherUser.data.type,
		arguments: {}
	})

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	})

	const firstTimeLogins = await jellyfish.query(context, session, {
		type: 'object',
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
		sortBy: 'created_at'
	})

	test.is(firstTimeLogins.length, 2)
	test.true(firstTimeLogins[0].active)
})

ava('successfully sends an email to a user with an array of emails', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		userCard,
		worker,
		org,
		nockRequest
	} = test.context

	let mailBody
	const saveBody = (body) => {
		mailBody = body
	}
	nockRequest(saveBody)

	const firstEmail = 'first@email.com'
	const secondEmail = 'second@email.com'
	const newUsername = 'janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: firstEmail,
			username: `user-${newUsername}`,
			password: 'foobarbaz'
		}
	})

	const newUser = await processAction(session, createUserAction)
	test.false(newUser.error)

	const sendUpdateCard = {
		action: 'action-update-card@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {
			reason: 'Making email an array for test',
			patch: [ {
				op: 'replace',
				path: '/data/email',
				value: [ firstEmail, secondEmail ]
			} ]
		}
	}

	const sendUpdate = await processAction(session, sendUpdateCard)
	test.false(sendUpdate.error)

	const userWithEmailArray = await jellyfish.getCardById(context, session, newUser.data.id)

	test.deepEqual(userWithEmailArray.data.email, [ firstEmail, secondEmail ])

	const linkAction = await createOrgLinkAction({
		toId: newUser.data.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, linkAction)

	const firstTimeLoginRequest = {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {}
	}

	const firstTimeLogin = await processAction(session, firstTimeLoginRequest)
	test.false(firstTimeLogin.error)

	const toIsInBody = checkForKeyValue('to', firstEmail, mailBody)
	test.true(toIsInBody)
})

ava('throws an error when the first-time-login user has no org', async (test) => {
	const {
		session,
		context,
		processAction,
		userCard,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	const userSlug = 'user-janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'new@email.com',
			username: userSlug,
			password: 'foobarbaz'
		}
	})

	const newUser = await processAction(session, createUserAction)
	test.false(newUser.error)

	await test.throwsAsync(processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {}
	}), {
		instanceOf: worker.errors.WorkerNoElement,
		message: `User with slug ${userSlug} is not a member of any organisations`
	})
})

ava('throws an error when the first-time-login requester has no org', async (test) => {
	const {
		session,
		context,
		processAction,
		adminOrgLink,
		user,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	await processAction(session, {
		action: 'action-delete-card@1.0.0',
		context,
		card: adminOrgLink.data.id,
		type: adminOrgLink.data.type,
		arguments: {}
	})

	await test.throwsAsync(processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	}), {
		instanceOf: worker.errors.WorkerNoElement,
		message: 'You do not belong to an organisation and thus cannot send a first-time login link to any users'
	})
})

ava('throws an error when the first-time-login user does not belong to the requester\'s org', async (test) => {
	const {
		session,
		context,
		processAction,
		userCard,
		orgCard,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	const userSlug = 'user-janedoe'
	const userPassword = 'foobarbaz'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'new@email.com',
			username: userSlug,
			password: userPassword
		}
	})

	const newUser = await processAction(session, createUserAction)
	test.false(newUser.error)

	const newOrg = await processAction(session, {
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

	const linkAction = await createOrgLinkAction({
		toId: newUser.data.id,
		fromId: newOrg.data.id,
		context
	})

	await processAction(session, linkAction)

	await test.throwsAsync(processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: `User with slug ${userSlug} is not a member of any of your organisations`
	})
})

ava('a community role is added to a supplied user with no role set', async (test) => {
	const {
		session,
		context,
		processAction,
		userCard,
		org,
		jellyfish,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	const createUserAction = await worker.pre(session, {
		action: 'action-create-card@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			reason: 'for testing',
			properties: {
				slug: 'user-janedoe',
				data: {
					hash: 'fake-hash',
					email: 'fake@email.com',
					roles: []
				}
			}
		}
	})

	const userWithoutRole = await processAction(session, createUserAction)
	test.false(userWithoutRole.error)

	const linkAction = await createOrgLinkAction({
		toId: userWithoutRole.data.id,
		fromId: org.data.id,
		context
	})

	await processAction(session, linkAction)

	await processAction(session, {
		action: 'action-send-first-time-login-link@1.0.0',
		context,
		card: userWithoutRole.data.id,
		type: userWithoutRole.data.type,
		arguments: {}
	})

	const updatedUser = await jellyfish.getCardById(context, session, userWithoutRole.data.id)

	test.deepEqual(updatedUser.data.roles, [ 'user-community' ])
})
