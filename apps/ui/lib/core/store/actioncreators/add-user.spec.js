/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import ava from 'ava'
import sinon from 'sinon'
import {
	actionCreators
} from './'

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
	const analytics = {
		track: sinon.stub()
	}

	analytics.track.resolves()

	sdk.auth.signup.resolves(user)

	const dispatch = (fn) => {
		return fn(...thunkArgs)
	}

	const thunkArgs = [
		dispatch,
		_.noop,
		{
			sdk,
			analytics
		}
	]

	test.context = {
		...test.context,
		sdk,
		username,
		email,
		user,
		org,
		thunkArgs
	}
})

ava('addUser uses the sdk.auth.signup to create a new user', async (test) => {
	const {
		sdk,
		username,
		email,
		org,
		thunkArgs
	} = test.context

	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreators.addUser({
		username,
		email,
		org
	})(...thunkArgs)

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
		sdk,
		username,
		email,
		user,
		org,
		thunkArgs
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreators.addUser({
		username,
		email,
		org
	})(...thunkArgs)

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
		sdk,
		username,
		email,
		user,
		org,
		thunkArgs
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	await actionCreators.addUser({
		username,
		email,
		org
	})(...thunkArgs)

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
		sdk,
		user,
		username,
		email,
		org,
		thunkArgs
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.resolves()

	const result = await actionCreators.addUser({
		username,
		email,
		org
	})(...thunkArgs)

	test.is(result, true)
})

ava('addUser returns false when it fails', async (test) => {
	const {
		sdk,
		user,
		username,
		email,
		org,
		thunkArgs
	} = test.context

	sdk.auth.signup.resolves(user)
	sdk.card.link.resolves()
	sdk.action.throws(new Error())

	const result = await actionCreators.addUser({
		username,
		email,
		org
	})(...thunkArgs)

	test.is(result, false)
})
