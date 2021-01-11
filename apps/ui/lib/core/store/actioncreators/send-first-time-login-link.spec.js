/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import * as notifications from '@balena/jellyfish-ui-components/lib/services/notifications'
import _ from 'lodash'

// Hack fix for a circular dependency until we refactor the notifications code
import {
	// eslint-disable-next-line no-unused-vars
	store
} from '../../'
import {
	actionCreators
} from './'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		action: sandbox.stub()
	}
	const user = {
		id: 'fake-user',
		type: 'user@1.0.0'
	}

	const analytics = {
		track: sinon.stub()
	}

	analytics.track.resolves()

	const dispatchedObjs = []
	const dispatch = (fn) => {
		dispatchedObjs.push(fn)
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
		dispatchedObjs,
		user,
		thunkArgs
	}
})

ava.afterEach((test) => {
	sandbox.restore()
})

ava('sendFirstTimeLoginLink uses the sdk.action to send a first-time login link to a user', async (test) => {
	const {
		sdk,
		user,
		thunkArgs
	} = test.context

	sdk.action.resolves()

	await actionCreators.sendFirstTimeLoginLink({
		user
	})(...thunkArgs)

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
		user,
		thunkArgs
	} = test.context

	const addNotification = sandbox.stub(notifications, 'addNotification')

	sdk.action.resolves()

	await actionCreators.sendFirstTimeLoginLink({
		user
	})(...thunkArgs)

	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'success', 'Sent first-time login token to user' ] ])
})

ava('sendFirstTimeLoginLink fires a \'danger\' notification when an error occurs', async (test) => {
	const {
		sdk,
		user,
		thunkArgs
	} = test.context

	const addNotification = sandbox.stub(notifications, 'addNotification')

	const errorMessage = 'User does not exist'
	sdk.action.throws(new Error(errorMessage))

	await actionCreators.sendFirstTimeLoginLink({
		user
	})(...thunkArgs)

	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'danger', errorMessage ] ])
})
