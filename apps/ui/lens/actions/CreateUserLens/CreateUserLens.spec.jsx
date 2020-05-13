/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../test/ui-setup'
import ava from 'ava'
import {
	mount,
	configure
} from 'enzyme'
import {
	Provider as ReduxProvider
} from 'react-redux'
import {
	Provider as ThemeProvider
} from 'rendition'
import sinon from 'sinon'
import Adapter from 'enzyme-adapter-react-16'
import React from 'react'
import configureStore from 'redux-mock-store'
import {
	sdk
} from '../../../core'
import {
	MemoryRouter
} from 'react-router-dom'

import CreateUserLens from './CreateUserLens'

const middlewares = []
const mockStore = configureStore(middlewares)

const initialState = {
	core: {
		types: []
	}
}
const store = mockStore(initialState)

configure({
	adapter: new Adapter()
})

const CHANNEL = {
	data: {
		head: {
			action: 'create',
			types: {
				id: 'dbd7a3e0-bf19-4710-9e31-62366cea6c6c',
				slug: 'user',
				type: 'type@1.0.0',
				active: true,
				version: '1.0.0',
				name: 'Jellyfish User',
				tags: [],
				markers: [],
				created_at: '2020-04-21T00:00:22.603Z',
				links: {},
				requires: [],
				capabilities: []
			}
		}
	}
}

const CARD = {
	seed: {
		type: 'user@1.0.0',
		markers: [
			'org-balena'
		]
	}
}

const ORG = {
	id: '8248af3b-7e4d-439f-bc00-4283afb6d18f',
	slug: 'org-balena',
	type: 'org@1.0.0'
}

const sandbox = sinon.createSandbox()

const flushPromises = () => {
	return new Promise((resolve) => {
		// eslint-disable-next-line no-undef
		return setImmediate(resolve)
	})
}

ava.beforeEach((test) => {
	const getBySlug = sandbox.stub(sdk, 'getBySlug')

	const actions = {
		addUser: sinon.stub(),
		removeChannel: sinon.stub(),
		addNotification: sinon.stub()
	}

	const wrappedComponent = (
		<MemoryRouter>
			<ReduxProvider store={store}>
				<ThemeProvider>
					<CreateUserLens
						channel={CHANNEL}
						card={CARD}
						store={store}
						actions={actions}
					/>
				</ThemeProvider>
			</ReduxProvider>
		</MemoryRouter>
	)

	test.context = {
		...test.context,
		getBySlug,
		actions,
		wrappedComponent
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava.serial('Retrieves org data on component update', async (test) => {
	const {
		wrappedComponent,
		getBySlug
	} = test.context
	getBySlug.resolves(ORG)
	const wrapper = await mount(wrappedComponent)
	const lens = wrapper.find(CreateUserLens).instance()
	test.deepEqual(lens.state.org, ORG)
})

ava.serial('Fires an error notification when the user card has no org markers', async (test) => {
	const {
		actions
	} = test.context

	const card = {
		seed: {
			type: 'user@1.0.0',
			markers: [ 'fakeMarker' ]
		}
	}

	mount(
		<MemoryRouter>
			<ReduxProvider store={store}>
				<ThemeProvider>
					<CreateUserLens
						channel={CHANNEL}
						card={card}
						store={store}
						actions={actions}
					/>
				</ThemeProvider>
			</ReduxProvider>
		</MemoryRouter>
	)

	test.is(actions.addNotification.callCount, 1)
	test.deepEqual(actions.addNotification.args, [ [ 'danger', 'You must belong to an organisation to add new users' ] ])
})

ava.serial('Fires an error notification when the user\'s organisation cannot be found', async (test) => {
	const {
		getBySlug,
		actions
	} = test.context

	const card = {
		seed: {
			type: 'user@1.0.0',
			markers: [ 'org-balena' ]
		}
	}

	getBySlug.resolves(null)

	const wrapper = mount(
		<MemoryRouter>
			<ReduxProvider store={store}>
				<ThemeProvider>
					<CreateUserLens
						channel={CHANNEL}
						card={card}
						store={store}
						actions={actions}
					/>
				</ThemeProvider>
			</ReduxProvider>
		</MemoryRouter>
	)

	await flushPromises()
	wrapper.update()

	test.is(actions.addNotification.callCount, 1)
	test.deepEqual(actions.addNotification.args, [ [ 'danger', 'Could not find your organisation' ] ])
})

ava.serial('Submit button is disabled if org is null', async (test) => {
	const {
		wrappedComponent,
		getBySlug
	} = test.context

	getBySlug.resolves(null)
	const wrapper = await mount(wrappedComponent)
	await flushPromises()
	wrapper.update()

	const lens = wrapper.find(CreateUserLens)
	test.is(lens.state().org, null)

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
	wrapper.update()

	test.deepEqual(lens.state().newCard, {
		data: {
			username: 'fakeUsername',
			email: 'fake@email.com'
		}
	})

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	test.true(submitButton.prop('disabled'))
})

ava.serial('Submit button is disabled if username is missing', async (test) => {
	const {
		wrappedComponent,
		getBySlug
	} = test.context
	getBySlug.resolves(null)
	const wrapper = await mount(wrappedComponent)

	await flushPromises()
	wrapper.update()

	const lens = wrapper.find(CreateUserLens)
	test.is(lens.state().org, null)

	const inputs = lens.find('input')
	const emailInput = inputs.at(1)

	emailInput.simulate('change', {
		target: {
			name: 'email',
			value: 'fake@email.com'
		}
	})

	await flushPromises()
	wrapper.update()

	test.deepEqual(lens.state().newCard, {
		data: {
			email: 'fake@email.com'
		}
	})

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	test.true(submitButton.prop('disabled'))
})

ava.serial('Submit button is disabled if email is missing', async (test) => {
	const {
		wrappedComponent,
		getBySlug
	} = test.context
	getBySlug.resolves(null)
	const wrapper = await mount(wrappedComponent)

	await flushPromises()
	wrapper.update()

	const lens = wrapper.find(CreateUserLens)
	test.is(lens.state().org, null)

	const inputs = lens.find('input')
	const usernameInput = inputs.at(0)

	usernameInput.simulate('change', {
		target: {
			name: 'username',
			value: 'fake-username'
		}
	})

	await flushPromises()
	wrapper.update()

	test.deepEqual(lens.state().newCard, {
		data: {
			username: 'fake-username'
		}
	})

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	test.true(submitButton.prop('disabled'))
})

ava.serial('On submit the addUser action is called', async (test) => {
	const {
		wrappedComponent,
		getBySlug,
		actions
	} = test.context

	getBySlug.resolves(ORG)

	const wrapper = await mount(wrappedComponent)
	await flushPromises()
	wrapper.update()

	const lens = wrapper.find(CreateUserLens)
	test.is(lens.state().org, ORG)

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
	wrapper.update()

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	submitButton.simulate('click')

	await flushPromises()
	wrapper.update()

	test.is(actions.addUser.callCount, 1)
	test.deepEqual(actions.addUser.args, [
		[
			{
				org: ORG,
				username: 'fakeUsername',
				email: 'fake@email.com'
			}
		]
	])
})

ava.serial('when addUser is successful, the channel is closed', async (test) => {
	const {
		wrappedComponent,
		getBySlug,
		actions
	} = test.context

	getBySlug.resolves(ORG)
	actions.addUser.resolves(true)

	const wrapper = await mount(wrappedComponent)
	await flushPromises()
	wrapper.update()

	const lens = wrapper.find(CreateUserLens)
	test.is(lens.state().org, ORG)

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
	wrapper.update()

	const submitButton = lens.find('button[data-test="create-user-lens__submit"]')
	submitButton.simulate('click')

	await flushPromises()
	wrapper.update()

	test.is(actions.removeChannel.callCount, 1)
	test.deepEqual(actions.removeChannel.args, [
		[ CHANNEL ]
	])
})
