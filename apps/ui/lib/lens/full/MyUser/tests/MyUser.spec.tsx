jest.mock('../../../common/RelationshipsTab');

import { getWrapper } from '../../../../../test/ui-setup';
import '../../../../../test/react-select-mock';
import sinon from 'sinon';
import { mount } from 'enzyme';
import React from 'react';
import MyUser from '../MyUser';
import { user, userType } from './fixtures';

const sdk = {
	authToken: 'xxx-xxx-xxx-xxx',
};

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper({
	core: {},
}).wrapper;

const selectTab = (component, tabName) => {
	component.find(`button[data-test="tab_${tabName}"]`).simulate('click');
	component.update();
};

let context: any = {};

describe('MyUser', () => {
	beforeEach(() => {
		context = {
			commonProps: {
				sdk,
				actions: {
					getIntegrationAuthUrl: sandbox
						.stub()
						.resolves('http://localhost:9000'),
					updateUser: sandbox.stub(),
					setPassword: sandbox.stub(),
				},
				card: user,
				types: [userType],
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('The user profile can updated', async () => {
		const { commonProps } = context;
		const component = await mount(<MyUser {...commonProps} />, {
			wrappingComponent,
		});
		selectTab(component, 'profile');

		component.find('input#root_first').simulate('change', {
			target: {
				value: 'foo',
			},
		});
		component.find('input#root_last').simulate('change', {
			target: {
				value: 'bar',
			},
		});
		component.find('[data-test="form_profile"] form').simulate('submit');

		expect(commonProps.actions.updateUser.calledOnce).toBe(true);
		expect(commonProps.actions.updateUser.getCall(0).firstArg).toEqual([
			{
				op: 'add',
				path: '/data/profile',
				value: {
					name: {
						first: 'foo',
						last: 'bar',
					},
					about: {},
				},
			},
		]);
	});

	test('The user password can reset', async () => {
		const { commonProps } = context;
		const component = await mount(<MyUser {...commonProps} />, {
			wrappingComponent,
		});
		selectTab(component, 'account');

		component.find('input#root_currentPassword').simulate('change', {
			target: {
				value: 'currentpassword',
			},
		});
		component.find('input#root_newPassword').simulate('change', {
			target: {
				value: 'newpassword',
			},
		});

		component.find('button[type="submit"]').simulate('click');

		expect(commonProps.actions.setPassword.calledOnce).toBe(true);
		expect(commonProps.actions.setPassword.getCall(0).args[0]).toBe(
			'currentpassword',
		);
		expect(commonProps.actions.setPassword.getCall(0).args[1]).toBe(
			'newpassword',
		);
	});

	test('The interface settings can updated', async () => {
		const { commonProps } = context;
		const component = await mount(<MyUser {...commonProps} />, {
			wrappingComponent,
		});
		selectTab(component, 'interface');

		component.find('button#root_profile_sendCommand').simulate('click');
		component
			.find('div#root_profile_sendCommand__select-drop button')
			.at(2)
			.simulate('click');

		component
			.find(
				'div.rendition-form__field--root_profile_disableNotificationSound input',
			)
			.simulate('change', {
				target: {
					checked: true,
				},
			});

		component.find('[data-test="form_interface"] form').simulate('submit');

		expect(commonProps.actions.updateUser.calledOnce).toBe(true);
		expect(commonProps.actions.updateUser.getCall(0).firstArg).toEqual([
			{
				op: 'add',
				path: '/data/profile',
				value: {
					sendCommand: 'enter',
					disableNotificationSound: true,
				},
			},
		]);
	});

	test('Oauth connections can be made', async () => {
		const { commonProps } = context;
		const component = await mount(<MyUser {...commonProps} />, {
			wrappingComponent,
		});
		selectTab(component, 'oauth');

		component
			.find('button[data-test="integration-connection--outreach"]')
			.simulate('click');
		expect(commonProps.actions.getIntegrationAuthUrl.calledOnce).toBe(true);
		expect(commonProps.actions.getIntegrationAuthUrl.getCall(0).args[1]).toBe(
			'outreach',
		);
	});
});
