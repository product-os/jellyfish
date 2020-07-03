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
import CompleteFirstTimeLogin from './CompleteFirstTimeLogin.jsx'

const MATCH = {
	params: {
		firstTimeLoginToken: '123456'
	}
}

const DATA_TEST_PREFIX = 'completeFirstTimeLogin-page'

const sandbox = sinon.createSandbox()

const wrappingComponent = getWrapper().wrapper

ava.before(() => {
	sandbox.stub(Img)
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Submit button is disabled if the new password input is empty', async (test) => {
	const completeFirstTimeLogin = mount(
		<CompleteFirstTimeLogin
			match={MATCH}
		/>, {
			wrappingComponent
		})

	await flushPromises()
	completeFirstTimeLogin.update()

	const passwordInput = completeFirstTimeLogin.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)

	test.is(passwordInput.prop('value'), '')

	const submitButton = completeFirstTimeLogin.find(`button[data-test="${DATA_TEST_PREFIX}__submit"]`)

	test.true(submitButton.prop('disabled'))
})

ava('Submit button is disabled if the new password does not match the password confirmation', async (test) => {
	const completeFirstTimeLogin = mount(
		<CompleteFirstTimeLogin
			match={MATCH}
		/>, {
			wrappingComponent
		})

	await flushPromises()
	completeFirstTimeLogin.update()

	const passwordInput = completeFirstTimeLogin.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)

	const passwordConfirmationInput = completeFirstTimeLogin.find(`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`)

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

	const submitButton = completeFirstTimeLogin.find(`button[data-test="${DATA_TEST_PREFIX}__submit"]`)

	test.true(submitButton.prop('disabled'))
})

ava('Fires the completeFirstTimeLogin and then the addNotification action when the form is submitted -' +
'redirects to login on success', async (test) => {
	const completeFirstTimeLoginAction = sandbox.stub()
	completeFirstTimeLoginAction.resolves(200)

	const addNotification = sandbox.stub()
	addNotification.resolves()

	const push = sandbox.stub()

	const completeFirstTimeLogin = mount(
		<CompleteFirstTimeLogin
			actions={{
				completeFirstTimeLogin: completeFirstTimeLoginAction,
				addNotification
			}}
			history={{
				push
			}}
			match={MATCH}
		/>, {
			wrappingComponent
		})

	await flushPromises()
	completeFirstTimeLogin.update()

	const passwordInput = completeFirstTimeLogin.find(`input[data-test="${DATA_TEST_PREFIX}__password"]`)
	const passwordConfirmationInput = completeFirstTimeLogin.find(`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`)

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

	const form = completeFirstTimeLogin.find(`form[data-test="${DATA_TEST_PREFIX}__form"]`)
	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	completeFirstTimeLogin.update()

	test.is(completeFirstTimeLoginAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'success', 'Successfully set password' ] ])

	// Redirects to login
	test.is(push.callCount, 1)
	test.deepEqual(push.args, [ [ '/' ] ])

	completeFirstTimeLoginAction.reset()
	addNotification.reset()
	completeFirstTimeLoginAction.rejects(new Error('Could not update'))

	form.simulate('submit', {
		target: {}
	})

	await flushPromises()
	completeFirstTimeLogin.update()

	test.is(completeFirstTimeLoginAction.callCount, 1)
	test.is(addNotification.callCount, 1)
	test.deepEqual(addNotification.args, [ [ 'danger', 'Could not update' ] ])
})
