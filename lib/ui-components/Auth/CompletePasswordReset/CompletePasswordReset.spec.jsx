/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	mount,
	configure
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import {
	Provider,
	Img
} from 'rendition'
import CompletePasswordReset from './CompletePasswordReset.jsx'

import Adapter from 'enzyme-adapter-react-16'

const DATA_TEST_PREFIX = 'completePasswordReset-page'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const sandbox = sinon.createSandbox()

const flushPromises = () => {
	return new Promise((resolve) => {
		// eslint-disable-next-line no-undef
		return setImmediate(resolve)
	})
}

ava.afterEach(() => {
	sandbox.restore()
})

ava('Submit button is disabled if the new password input is empty', async (test) => {
	sandbox.stub(Img)

	const action = sandbox.stub()
	action.resolves(200)

	const completePasswordReset = mount(
		<CompletePasswordReset
			match={{
				resetToken: '123456'
			}}
		/>, {
			wrappingComponent: Provider
		})

	await flushPromises()
	completePasswordReset.update()

	const passwordInput = completePasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)

	test.is(passwordInput.prop('value'), '')

	const submitButton = completePasswordReset.find(`button[data-test="${DATA_TEST_PREFIX}__submit"]`)

	test.true(submitButton.prop('disabled'))
})

ava('Submit button is disabled if the new password does not match the password confirmation', async (test) => {
	sandbox.stub(Img)

	const action = sandbox.stub()
	action.resolves(200)

	const completePasswordReset = mount(
		<CompletePasswordReset
			match={{
				params: {
					resetToken: '1234567'
				}
			}}
		/>, {
			wrappingComponent: Provider
		})

	await flushPromises()
	completePasswordReset.update()

	const passwordInput = completePasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)

	const passwordConfirmationInput = completePasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`)

	passwordInput.simulate('change', {
		target: {
			name: 'password', value: 'newPassword'
		}
	})
	passwordConfirmationInput.simulate('change', {
		target: {
			name: 'passwordConfirmation', value: 'aDifferentPassword'
		}
	})

	const submitButton = completePasswordReset.find(`button[data-test="${DATA_TEST_PREFIX}__submit"]`)

	test.true(submitButton.prop('disabled'))
})

ava('Fires the completePasswordReset and then the addNotification action when the form is submitted -' +
'redirects to login on success', async (test) => {
	sandbox.stub(Img)

	const completePasswordResetAction = sandbox.stub()
	completePasswordResetAction.resolves(200)

	const addNotification = sandbox.stub()
	addNotification.resolves()

	const push = sandbox.stub()

	const completePasswordReset = mount(
		<CompletePasswordReset
			actions={{
				completePasswordReset: completePasswordResetAction,
				addNotification
			}}
			history={{
				push
			}}
			match={{
				params: {
					resetToken: '1234567'
				}
			}}
		/>, {
			wrappingComponent: Provider
		})

	await flushPromises()
	completePasswordReset.update()

	const passwordInput = completePasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)
	const passwordConfirmationInput = completePasswordReset.find(`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`)

	passwordInput.simulate('change', {
		target: {
			name: 'password', value: 'newPassword'
		}
	})
	passwordConfirmationInput.simulate('change', {
		target: {
			name: 'passwordConfirmation', value: 'newPassword'
		}
	})

	const form = completePasswordReset.find(`form[data-test="${DATA_TEST_PREFIX}__form"]`)
	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	completePasswordReset.update()

	test.is(completePasswordResetAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'success', 'Successfully reset password' ] ])

	// Redirects to login
	test.is(push.callCount, 1)
	test.deepEqual(push.args, [ [ '/' ] ])

	completePasswordResetAction.reset()
	addNotification.reset()
	completePasswordResetAction.rejects(new Error('Could not update'))

	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	completePasswordReset.update()

	test.is(completePasswordResetAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'danger', 'Could not update' ] ])
})
