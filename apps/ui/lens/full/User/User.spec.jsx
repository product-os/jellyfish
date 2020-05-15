/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'

// TODO: Remove this unused import if we resolve the circular dependency
// eslint-disable-next-line no-unused-vars
import full from '../../full'
import User from './User'

const {
	wrapper
} = getWrapper({
	core: {
		types: []
	}
})

const USER = {
	slug: 'user-operator',
	type: 'user@1.0.0',
	data: {
		roles: [
			'user-community',
			'user-operator'
		]
	}
}

const CARD = {
	slug: 'user-hannahmontana',
	type: 'user@1.0.0'
}

const sandbox = sinon.createSandbox()

ava.afterEach(() => {
	sandbox.restore()
})

ava.serial('actionItem "send first-time login link"  can be used to fire' +
' the sendFirstTimeLoginLink action when the user has an operator role', async (test) => {
	const actions = {
		sendFirstTimeLoginLink: sandbox.stub()
	}

	const component = mount(
		<User
			card={CARD}
			user={USER}
			actions={actions}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const sendFirstTimeLoginLink = component.find('a[data-test="card-action-menu__send-first-time-login"]')
	test.is(sendFirstTimeLoginLink.length, 1)

	sendFirstTimeLoginLink.simulate('click')

	test.is(actions.sendFirstTimeLoginLink.callCount, 1)
	test.deepEqual(actions.sendFirstTimeLoginLink.args, [
		[ {
			user: CARD
		} ]
	])
})

ava.serial('actionItem "send first-time login link"  does not appear ' +
'in the action menu when the user has no operator role', async (test) => {
	USER.data.roles = [ 'user-community' ]
	const component = mount(
		<User
			card={CARD}
			user={USER}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const sendFirstTimeLoginLink = component.find('a[data-test="card-action-menu__send-first-time-login"]')
	test.is(sendFirstTimeLoginLink.length, 0)
})
