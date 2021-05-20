/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper,
	flushPromises
} from '../../../../test/ui-setup'
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
		types: [
			{
				slug: 'user',
				type: 'type@1.0.0',
				version: '1.0.0'
			}
		]
	}
})

const BALENA_ORG = {
	slug: 'org-balena',
	type: 'org@1.0.0'
}

const USER = {
	slug: 'user-operator',
	type: 'user@1.0.0'
}

const CARD = {
	slug: 'user-hannahmontana',
	type: 'user@1.0.0',
	data: {
		roles: [ 'user-community' ]
	}
}

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		query: sandbox.stub(),
		card: {
			update: sandbox.stub(),
			unlink: sandbox.stub()
		}
	}
	test.context.userProps = {
		sdk,
		balenaOrg: BALENA_ORG,
		card: CARD,
		user: USER,
		actions: {
			sendFirstTimeLoginLink: sandbox.stub()
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('actionItem "send first-time login link"  can be used to fire' +
' the sendFirstTimeLoginLink action when the user has an operator role', async (test) => {
	const {
		userProps
	} = test.context
	userProps.sdk.query.resolves([ {
		...USER,
		data: {
			roles: [ 'user-community', 'user-operator' ]
		}
	} ])

	const component = mount(
		<User	{...userProps} />, {
			wrappingComponent: wrapper
		}
	)

	await flushPromises()
	component.update()

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const sendFirstTimeLoginLink = component.find('a[data-test="card-action-menu__send-first-time-login"]')
	test.is(sendFirstTimeLoginLink.length, 1)

	sendFirstTimeLoginLink.simulate('click')

	test.is(userProps.actions.sendFirstTimeLoginLink.callCount, 1)
	test.deepEqual(userProps.actions.sendFirstTimeLoginLink.args, [
		[ {
			user: CARD
		} ]
	])
})

ava('actionItem "Offboard user"  can be used to update' +
' the user\'s card and link to org when the user has an operator role', async (test) => {
	const {
		userProps
	} = test.context

	userProps.sdk.query.resolves([ {
		...USER,
		data: {
			roles: [ 'user-community', 'user-operator' ]
		}
	} ])

	const component = mount(
		<User {...userProps} />, {
			wrappingComponent: wrapper
		}
	)

	await flushPromises()
	component.update()

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const offboardUserLink = component.find('a[data-test="card-action-menu__offboard-user"]')
	test.is(offboardUserLink.length, 1)

	offboardUserLink.simulate('click')

	await flushPromises()
	component.update()

	test.is(userProps.sdk.card.update.callCount, 1)
	test.deepEqual(userProps.sdk.card.update.getCall(0).args[2], [
		{
			op: 'replace',
			path: '/data/roles/0',
			value: 'user-external-support'
		}
	])

	test.is(userProps.sdk.card.unlink.callCount, 1)
	const unlinkCallArgs = userProps.sdk.card.unlink.getCall(0).args
	test.is(unlinkCallArgs[0].slug, CARD.slug)
	test.is(unlinkCallArgs[1].slug, BALENA_ORG.slug)
	test.is(unlinkCallArgs[2], 'is member of')
})

ava('actionItem "send first-time login link"  does not appear ' +
'in the action menu when the user has no operator role', async (test) => {
	const {
		userProps
	} = test.context

	userProps.sdk.query.resolves([ {
		...USER,
		data: {
			roles: [ 'user-community' ]
		}
	} ])

	const component = mount(
		<User {...userProps} />, {
			wrappingComponent: wrapper
		}
	)
	await flushPromises()
	component.update()

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const sendFirstTimeLoginLink = component.find('a[data-test="card-action-menu__send-first-time-login"]')
	test.is(sendFirstTimeLoginLink.length, 0)
})

ava('actionItem "Offboard user"  does not appear ' +
'in the action menu when the user has no operator role', async (test) => {
	const {
		userProps
	} = test.context

	userProps.sdk.query.resolves([ {
		...USER,
		data: {
			roles: [ 'user-community' ]
		}
	} ])

	const component = mount(
		<User {...userProps} />, {
			wrappingComponent: wrapper
		}
	)
	await flushPromises()
	component.update()

	const actionMenu = component.find('button[data-test="card-action-menu"]')
	actionMenu.simulate('click')

	const offboardUserLink = component.find('a[data-test="card-action-menu__offboard-user"]')
	test.is(offboardUserLink.length, 0)
})
