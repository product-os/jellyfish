/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import ava from 'ava'
import {
	shallow,
	configure
} from 'enzyme'
import sinon from 'sinon'
import Adapter from 'enzyme-adapter-react-16'
import UserStatusMenuItem from './UserStatusMenuItem'
import user from '../core/cards/user'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const DND = {
	title: 'Do Not Disturb',
	value: 'DoNotDisturb'
}

const Available = {
	title: 'Available',
	value: 'Available'
}

const types = [ user ]

const getUser = (status) => {
	return {
		id: '1',
		data: {
			status
		}
	}
}

const sandbox = sinon.createSandbox()

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('It should render', (test) => {
	const actions = {
		updateUser: sandbox.fake()
	}
	test.notThrows(() => {
		shallow(
			<UserStatusMenuItem
				user={getUser(DND)}
				actions={actions}
				types={types}
			/>
		)
	})
})

ava('Tooltip and icon set correctly if status is DoNotDisturb', (test) => {
	const actions = {
		updateUser: sandbox.stub()
	}
	const component = shallow(
		<UserStatusMenuItem
			user={getUser(DND)}
			actions={actions}
			types={types}
		/>
	)

	const btn = component.find('[data-test="button-dnd"]')
	test.is(btn.props().tooltip.text, 'Turn off Do Not Disturb')

	const icon = component.find('Icon')
	test.is(icon.props().name, 'check')
})

ava('Tooltip and icon set correctly if status is NOT DoNotDisturb', (test) => {
	const actions = {
		updateUser: sandbox.stub()
	}
	const component = shallow(
		<UserStatusMenuItem
			user={getUser(Available)}
			actions={actions}
			types={types}
		/>
	)

	const btn = component.find('[data-test="button-dnd"]')
	test.is(btn.props().tooltip.text, 'Turn off notifications')

	const icon = component.find('Icon')
	test.is(icon.length, 0)
})

ava('Clicking button sets status to Available if currently DoNotDisturb', (test) => {
	const actions = {
		updateUser: sandbox.stub()
	}
	const component = shallow(
		<UserStatusMenuItem
			user={getUser(DND)}
			actions={actions}
			types={types}
		/>
	)

	const btn = component.find('[data-test="button-dnd"]')
	btn.simulate('click')

	test.true(actions.updateUser.calledOnce)
	test.deepEqual(actions.updateUser.getCall(0).args[0], [
		{
			op: 'replace',
			path: '/data/status/value',
			value: Available.value
		},
		{
			op: 'replace',
			path: '/data/status/title',
			value: Available.title
		}
	])
})

ava('Clicking button sets status to DoNotDisturb if currently Available', (test) => {
	const actions = {
		updateUser: sandbox.stub()
	}
	const component = shallow(
		<UserStatusMenuItem
			user={getUser(Available)}
			actions={actions}
			types={types}
		/>
	)

	const btn = component.find('[data-test="button-dnd"]')
	btn.simulate('click')

	test.true(actions.updateUser.calledOnce)
	test.deepEqual(actions.updateUser.getCall(0).args[0], [
		{
			op: 'replace',
			path: '/data/status/value',
			value: DND.value
		},
		{
			op: 'replace',
			path: '/data/status/title',
			value: DND.title
		}
	])
})
