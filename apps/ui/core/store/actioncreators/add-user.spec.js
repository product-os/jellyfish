/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import ActionCreator from './'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		auth: {
			signup: sandbox.stub()
		},
		card: {
			link: sandbox.stub()
		},
		action: sandbox.stub()
	}
	const username = 'fakeUsername'
	const email = 'fake@email.com'
	const user = {
		id: 'fake-user',
		type: 'user@1.0.0',
		slug: `user-${username}`,
		data: {
			email
		}
	}

	const org = {
		id: 'fake-org'
	}
	const actionCreator = new ActionCreator({
		sdk,
		analytics: {
			track: sinon.stub()
		}
	})
	actionCreator.analytics.track.resolves()
	sdk.auth.signup.resolves(user)

	const dispatch = (fn) => {
		return fn(dispatch)
	}

	test.context = {
		...test.context,
		actionCreator,
		sdk,
		dispatch,
		username,
		email,
		user,
		org
	}
})

ava('addUser uses the sdk.auth.signup to create a new user', async (test) => {
	const {
		sdk,
		actionCreator,
		dispatch,
		username,
		email,
		org
	} = test.context

	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreator.addUser({
		username,
		email,
		org
	})(dispatch)

	test.is(sdk.auth.signup.callCount, 1)
	test.deepEqual(sdk.auth.signup.args, [
		[
			{
				username,
				email,
				password: ''
			}
		]
	])
})

ava('addUser uses the sdk.card.link method (via firing a dispatch to the createLink action) ' +
' to create a link between the org and the user', async (test) => {
	const {
		actionCreator,
		dispatch,
		sdk,
		username,
		email,
		user,
		org
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreator.addUser({
		username,
		email,
		org
	})(dispatch)

	test.is(sdk.card.link.callCount, 1)
	test.deepEqual(sdk.card.link.args, [ [
		org,
		user,
		'has member'
	] ])
})

ava('addUser uses the sdk.action method (via firing a dispatch to the sendFirstTimeLoginLink action)' +
' to send a first-time login link to the new user', async (test) => {
	const {
		actionCreator,
		dispatch,
		sdk,
		username,
		email,
		user,
		org
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreator.addUser({
		username,
		email,
		org
	})(dispatch)

	test.is(sdk.action.callCount, 1)
	test.deepEqual(sdk.action.args, [
		[ {
			action: 'action-send-first-time-login-link@1.0.0',
			arguments: {},
			card: user.id,
			type: user.type
		} ]
	])
})

ava('addUser returns true when it succeeds', async (test) => {
	const {
		actionCreator,
		dispatch,
		sdk,
		user,
		username,
		email,
		org
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	const result = await actionCreator.addUser({
		username,
		email,
		org
	})(dispatch)

	test.is(result, true)
})

ava('addUser returns false when it fails', async (test) => {
	const {
		actionCreator,
		dispatch,
		sdk,
		user,
		username,
		email,
		org
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.throws(new Error())

	const result = await actionCreator.addUser({
		username,
		email,
		org
	})(dispatch)

	test.is(result, false)
})
