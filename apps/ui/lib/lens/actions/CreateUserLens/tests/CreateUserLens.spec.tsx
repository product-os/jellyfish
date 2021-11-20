import { flushPromises, getWrapper } from '../../../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { notifications } from '@balena/jellyfish-ui-components';
import CreateUserLens from '../CreateUserLens';
import CHANNEL from './fixtures/channel.json';
import USER from './fixtures/user.json';

const initialState = {
	core: {
		types: [],
	},
};

const sandbox = sinon.createSandbox();

let context: any = {};

describe('CreateUserLens', () => {
	beforeEach(() => {
		const actions = {
			addUser: sinon.stub(),
			removeChannel: sinon.stub(),
		};

		const { store, wrapper } = getWrapper(initialState);

		const mountComponent = (props = {}) => {
			return mount(
				<CreateUserLens
					channel={CHANNEL}
					user={USER}
					card={{}}
					store={store}
					actions={actions}
					{...props}
				/>,
				{
					wrappingComponent: wrapper,
				},
			);
		};

		context = {
			...context,
			actions,
			mountComponent,
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test("Fires an error notification when the user's organisation cannot be found", async () => {
		const { mountComponent } = context;

		const addNotification = sinon.stub(notifications, 'addNotification');

		const lens = await mountComponent({
			user: {},
		});

		await flushPromises();
		lens.update();

		expect(addNotification.callCount).toBe(1);
		expect(addNotification.args).toEqual([
			['danger', 'You must belong to an organisation to add new users'],
		]);
	});

	test('Submit button is disabled if username is missing', async () => {
		const { mountComponent } = context;
		const lens = await mountComponent();

		await flushPromises();
		lens.update();

		const inputs = lens.find('input');
		const emailInput = inputs.at(1);

		emailInput.simulate('change', {
			target: {
				name: 'email',
				value: 'fake@email.com',
			},
		});

		await flushPromises();
		lens.update();

		expect(lens.state().formData).toEqual({
			email: 'fake@email.com',
		});

		const submitButton = lens.find(
			'button[data-test="create-user-lens__submit"]',
		);
		expect(submitButton.prop('disabled')).toBe(true);
	});

	test('Submit button is disabled if email is missing', async () => {
		const { mountComponent } = context;
		const lens = await mountComponent();

		await flushPromises();
		lens.update();

		const inputs = lens.find('input');
		const usernameInput = inputs.at(0);

		usernameInput.simulate('change', {
			target: {
				name: 'username',
				value: 'fake-username',
			},
		});

		await flushPromises();
		lens.update();

		expect(lens.state().formData).toEqual({
			username: 'fake-username',
		});

		const submitButton = lens.find(
			'button[data-test="create-user-lens__submit"]',
		);
		expect(submitButton.prop('disabled')).toBe(true);
	});

	test('On submit the addUser action is called', async () => {
		const { mountComponent, actions } = context;

		const lens = await mountComponent();
		await flushPromises();
		lens.update();

		lens.setState({
			formData: {
				username: 'fakeUsername',
				email: 'fake@email.com',
				organisation: 'org-balena',
			},
			cardIsValid: true,
		});

		await flushPromises();
		lens.update();

		const submitButton = lens.find(
			'button[data-test="create-user-lens__submit"]',
		);
		submitButton.simulate('click');

		await flushPromises();
		lens.update();

		expect(actions.addUser.callCount).toBe(1);
		expect(actions.addUser.args).toEqual([
			[
				{
					org: USER.links['is member of'][0],
					username: 'fakeUsername',
					email: 'fake@email.com',
				},
			],
		]);
	});

	test('when addUser is successful, the channel is closed', async () => {
		const { mountComponent, actions } = context;

		actions.addUser.resolves(true);

		const lens = await mountComponent();
		await flushPromises();
		lens.update();

		const inputs = lens.find('input');
		const usernameInput = inputs.at(0);
		const emailInput = inputs.at(1);

		usernameInput.simulate('change', {
			target: {
				name: 'username',
				value: 'fakeUsername',
			},
		});

		emailInput.simulate('change', {
			target: {
				name: 'email',
				value: 'fake@email.com',
			},
		});

		await flushPromises();
		lens.update();

		const submitButton = lens.find(
			'button[data-test="create-user-lens__submit"]',
		);
		submitButton.simulate('click');

		await flushPromises();
		lens.update();

		expect(actions.removeChannel.callCount).toBe(1);
		expect(actions.removeChannel.args).toEqual([[CHANNEL]]);
	});
});
