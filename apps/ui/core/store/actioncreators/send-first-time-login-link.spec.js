/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'

// Hack fix for a circular dependency until we refactor the notifications code
import {
	// eslint-disable-next-line no-unused-vars
	store
} from '../../'
import ActionCreator from './'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		action: sandbox.stub()
	}
	const user = {
		id: 'fake-user',
		type: 'user@1.0.0'
	}

	const actionCreator = new ActionCreator({
		sdk,
		analytics: {
			track: sinon.stub()
		}
	})
	actionCreator.analytics.track.resolves()

	const dispatchedObjs = []
	const dispatch = (fn) => {
		dispatchedObjs.push(fn)
		return fn(dispatch)
	}

	test.context = {
		...test.context,
		actionCreator,
		sdk,
		dispatch,
		dispatchedObjs,
		user
	}
})

ava('sendFirstTimeLoginLink uses the sdk.action to send a first-time login link to a user', async (test) => {
	const {
		sdk,
		actionCreator,
		dispatch,
		user
	} = test.context

	sdk.action.resolves()

	await actionCreator.sendFirstTimeLoginLink({
		user
	})(dispatch)

	test.is(sdk.action.callCount, 1)
	test.deepEqual(sdk.action.args, [
		[
			{
				action: 'action-send-first-time-login-link@1.0.0',
				arguments: {},
				card: user.id,
				type: user.type
			}
		]
	])
})

ava('sendFirstTimeLoginLink fires a \'success\' notification when successful', async (test) => {
	const {
		sdk,
		actionCreator,
		dispatch,
		dispatchedObjs,
		user
	} = test.context

	sdk.action.resolves()

	await actionCreator.sendFirstTimeLoginLink({
		user
	})(dispatch)

	const action = dispatchedObjs.pop()
	test.is(action.type, 'ADD_NOTIFICATION')
	test.is(action.value.message, 'Sent first-time login token to user')
	test.is(action.value.type, 'success')
})

ava('sendFirstTimeLoginLink fires a \'danger\' notification when an error occurs', async (test) => {
	const {
		sdk,
		actionCreator,
		dispatch,
		dispatchedObjs,
		user
	} = test.context

	const errorMessage = 'User does not exist'
	sdk.action.throws(new Error(errorMessage))

	await actionCreator.sendFirstTimeLoginLink({
		user
	})(dispatch)

	const action = dispatchedObjs.pop()
	test.is(action.type, 'ADD_NOTIFICATION')
	test.is(action.value.message, errorMessage)
	test.is(action.value.type, 'danger')
})
