/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../../test/ui-setup'
import '../../../../../test/react-select-mock'
import ava from 'ava'
import sinon from 'sinon'
import {
	mount
} from 'enzyme'
import React from 'react'
import MyUser from '../MyUser'
import {
	user,
	userType
} from './fixtures'

const sdk = {
	authToken: 'xxx-xxx-xxx-xxx'
}

const sandbox = sinon.createSandbox()

const wrappingComponent = getWrapper({
	core: {}
}).wrapper

const selectTab = (component, tabName) => {
	component.find(`button[data-test="tab_${tabName}"]`).simulate('click')
	component.update()
}

ava.beforeEach((test) => {
	test.context.commonProps = {
		sdk,
		actions: {
			getIntegrationAuthUrl: sandbox.stub().resolves('http://localhost:9000'),
			updateUser: sandbox.stub(),
			setPassword: sandbox.stub()
		},
		card: user,
		types: [ userType ]
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('The user profile can updated', async (test) => {
	const {
		commonProps
	} = test.context
	const component = await mount(<MyUser {...commonProps} />, {
		wrappingComponent
	})
	selectTab(component, 'profile')

	component.find('input#root_first').simulate('change', {
		target: {
			value: 'foo'
		}
	})
	component.find('input#root_last').simulate('change', {
		target: {
			value: 'bar'
		}
	})
	component.find('[data-test="form_profile"] form').simulate('submit')

	test.true(commonProps.actions.updateUser.calledOnce)
	test.deepEqual(commonProps.actions.updateUser.getCall(0).firstArg, [
		{
			op: 'add',
			path: '/data/profile',
			value: {
				name: {
					first: 'foo',
					last: 'bar'
				},
				about: {}
			}
		}
	])
})

ava('The user password can reset', async (test) => {
	const {
		commonProps
	} = test.context
	const component = await mount(<MyUser {...commonProps} />, {
		wrappingComponent
	})
	selectTab(component, 'account')

	component.find('input#root_currentPassword').simulate('change', {
		target: {
			value: 'currentpassword'
		}
	})
	component.find('input#root_newPassword').simulate('change', {
		target: {
			value: 'newpassword'
		}
	})

	component.find('button[type="submit"]').simulate('click')

	test.true(commonProps.actions.setPassword.calledOnce)
	test.is(commonProps.actions.setPassword.getCall(0).args[0], 'currentpassword')
	test.is(commonProps.actions.setPassword.getCall(0).args[1], 'newpassword')
})

ava('The interface settings can updated', async (test) => {
	const {
		commonProps
	} = test.context
	const component = await mount(<MyUser {...commonProps} />, {
		wrappingComponent
	})
	selectTab(component, 'interface')

	component.find('button#root_profile_sendCommand').simulate('click')
	component.find('div#root_profile_sendCommand__select-drop button').at(2).simulate('click')

	component.find('div.rendition-form__field--root_profile_disableNotificationSound input')
		.simulate('change',
			{
				target: {
					checked: true
				}
			})

	component.find('[data-test="form_interface"] form').simulate('submit')

	test.true(commonProps.actions.updateUser.calledOnce)
	test.deepEqual(commonProps.actions.updateUser.getCall(0).firstArg, [
		{
			op: 'add',
			path: '/data/profile',
			value: {
				sendCommand: 'enter',
				disableNotificationSound: true
			}
		}
	])
})

ava('Oauth connections can be made', async (test) => {
	const {
		commonProps
	} = test.context
	const component = await mount(<MyUser {...commonProps} />, {
		wrappingComponent
	})
	selectTab(component, 'oauth')

	component.find('button[data-test="integration-connection--outreach"]').simulate('click')
	test.true(commonProps.actions.getIntegrationAuthUrl.calledOnce)
	test.is(commonProps.actions.getIntegrationAuthUrl.getCall(0).args[1], 'outreach')
})
