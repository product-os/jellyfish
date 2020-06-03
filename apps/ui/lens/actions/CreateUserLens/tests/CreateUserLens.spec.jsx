/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	flushPromises,
	getWrapper
} from '../../../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import CreateUserLens from '../CreateUserLens'
import CHANNEL from './fixtures/channel.json'
import USER from './fixtures/user.json'

const initialState = {
	core: {
		types: []
	}
}

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const actions = {
		addUser: sinon.stub(),
		removeChannel: sinon.stub(),
		addNotification: sinon.stub()
	}

	const {
		store,
		wrapper
	} = getWrapper(initialState)

	const mountComponent = (props = {}) => {
		return mount((
			<CreateUserLens
				channel={CHANNEL}
				user={USER}
				card={{}}
				store={store}
				actions={actions}
				{...props}
			/>
		), {
			wrappingComponent: wrapper
		})
	}

	test.context = {
		...test.context,
		actions,
		mountComponent
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava.serial('Fires an error notification when the user\'s organisation cannot be found', async (test) => {
	const {
		mountComponent,
		actions
	} = test.context

	const lens = await mountComponent({
		user: {}
	})

	await flushPromises()
	lens.update()

	test.is(actions.addNotification.callCount, 1)
	test.deepEqual(actions.addNotification.args, [ [ 'danger', 'You must belong to an organisation to add new users' ] ])
})

ava.serial('Submit button is disabled if username is missing', async (test) => {
	const {
		mountComponent
	} = test.context
	const lens = await mountComponent()

	await flushPromises()
	lens.update()

	const inputs = lens.find('input')
	const emailInput = inputs.at(1)

	emailInput.simulate('change', {
		target: {
			name: 'email',
			value: 'fake@email.com'
		}
	})

	await flushPromises()
	lens.update()

	test.deepEqual(lens.state().formData, {
		email: 'fake@email.com'
	})

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	test.true(submitButton.prop('disabled'))
})

ava.serial('Submit button is disabled if email is missing', async (test) => {
	const {
		mountComponent
	} = test.context
	const lens = await mountComponent()

	await flushPromises()
	lens.update()

	const inputs = lens.find('input')
	const usernameInput = inputs.at(0)

	usernameInput.simulate('change', {
		target: {
			name: 'username',
			value: 'fake-username'
		}
	})

	await flushPromises()
	lens.update()

	test.deepEqual(lens.state().formData, {
		username: 'fake-username'
	})

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	test.true(submitButton.prop('disabled'))
})

ava.serial('On submit the addUser action is called', async (test) => {
	const {
		mountComponent,
		actions
	} = test.context

	const lens = await mountComponent()
	await flushPromises()
	lens.update()

	lens.setState({
		formData: {
			username: 'fakeUsername',
			email: 'fake@email.com',
			organisation: 'org-balena'
		},
		cardIsValid: true
	})

	await flushPromises()
	lens.update()

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	submitButton.simulate('click')

	await flushPromises()
	lens.update()

	test.is(actions.addUser.callCount, 1)
	test.deepEqual(actions.addUser.args, [
		[
			{
				org: USER.links['is member of'][0],
				username: 'fakeUsername',
				email: 'fake@email.com'
			}
		]
	])
})

ava.serial('when addUser is successful, the channel is closed', async (test) => {
	const {
		mountComponent,
		actions
	} = test.context

	actions.addUser.resolves(true)

	const lens = await mountComponent()
	await flushPromises()
	lens.update()

	const inputs = lens.find('input')
	const usernameInput = inputs.at(0)
	const emailInput = inputs.at(1)

	usernameInput.simulate('change', {
		target: {
			name: 'username',
			value: 'fakeUsername'
		}
	})

	emailInput.simulate('change', {
		target: {
			name: 'email',
			value: 'fake@email.com'
		}
	})

	await flushPromises()
	lens.update()

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	submitButton.simulate('click')

	await flushPromises()
	lens.update()

	test.is(actions.removeChannel.callCount, 1)
	test.deepEqual(actions.removeChannel.args, [
		[ CHANNEL ]
	])
})
