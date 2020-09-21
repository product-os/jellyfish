/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	flushPromises,
	getWrapper
} from '../../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import {
	Img
} from 'rendition'
import RequestPasswordReset from './RequestPasswordReset.jsx'
import * as notifications from '@balena/jellyfish-ui-components/lib/services/notifications'

const DATA_TEST_PREFIX = 'requestPasswordReset-page'

const wrappingComponent = getWrapper().wrapper

const sandbox = sinon.createSandbox()

ava.afterEach(() => {
	sandbox.restore()
})

ava('Submit button is disabled if the username input is empty', async (test) => {
	sandbox.stub(Img)

	const requestPasswordReset = mount(
		<RequestPasswordReset/>, {
			wrappingComponent
		})

	await flushPromises()

	const usernameInput = requestPasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__username"]`)

	test.is(usernameInput.prop('value'), '')

	const submitButton = requestPasswordReset.find(`button[data-test="${DATA_TEST_PREFIX}__submit"]`)

	test.true(submitButton.prop('disabled'))
})

ava('Fires the requirePasswordReset action followed by a success notification when the form is submitted', async (test) => {
	const username = 'fake@username.com'

	sandbox.stub(Img)

	const requestPasswordResetAction = sandbox.stub()
	requestPasswordResetAction.resolves(200)

	const addNotification = sandbox.stub(notifications, 'addNotification')

	const requestPasswordReset = mount(
		<RequestPasswordReset
			actions={{
				requestPasswordReset: requestPasswordResetAction
			}}
		/>, {
			wrappingComponent
		})

	await flushPromises()
	requestPasswordReset.update()

	const usernameInput = requestPasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__username"]`)

	usernameInput.simulate('change', {
		target: {
			name: 'username', value: username
		}
	})

	const form = requestPasswordReset.find(`form[data-test="${DATA_TEST_PREFIX}__form"]`)
	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	requestPasswordReset.update()

	test.is(requestPasswordResetAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args,
		[ [ 'success', 'Thanks! Please check your email for a link to reset your password' ] ])
})

ava('Sends a danger notification if the action throws an error', async (test) => {
	const username = 'fake@username.com'

	sandbox.stub(Img)

	const requestPasswordResetAction = sandbox.stub()
	requestPasswordResetAction.rejects(new Error())

	const addNotification = sandbox.stub(notifications, 'addNotification')

	const requestPasswordReset = mount(
		<RequestPasswordReset
			actions={{
				requestPasswordReset: requestPasswordResetAction
			}}
		/>, {
			wrappingComponent
		})

	await flushPromises()
	requestPasswordReset.update()

	const usernameInput = requestPasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__username"]`)

	usernameInput.simulate('change', {
		target: {
			name: 'username', value: username
		}
	})

	const form = requestPasswordReset.find(`form[data-test="${DATA_TEST_PREFIX}__form"]`)
	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	requestPasswordReset.update()

	test.is(requestPasswordResetAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'danger',
		`Whoops! Something went wrong while trying to request a password reset for username ${username}` ] ])
})
