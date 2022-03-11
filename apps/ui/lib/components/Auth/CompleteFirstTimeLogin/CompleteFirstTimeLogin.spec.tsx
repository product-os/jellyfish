import { flushPromises, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import * as notifications from '../../../services/notifications';
import CompleteFirstTimeLogin from './CompleteFirstTimeLogin';

const MATCH = {
	params: {
		firstTimeLoginToken: '123456',
	},
};

const DATA_TEST_PREFIX = 'completeFirstTimeLogin-page';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper().wrapper;

describe('CompleteFirstTimeLogin', () => {
	afterEach(() => {
		sandbox.restore();
	});

	describe('Submit button', () => {
		test('is disabled if the new password input is empty', async () => {
			const completeFirstTimeLogin = mount(
				<CompleteFirstTimeLogin match={MATCH} />,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completeFirstTimeLogin.update();

			const passwordInput = completeFirstTimeLogin.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);

			expect(passwordInput.prop('value')).toBe('');

			const submitButton = completeFirstTimeLogin.find(
				`button[data-test="${DATA_TEST_PREFIX}__submit"]`,
			);

			expect(submitButton.prop('disabled')).toBe(true);
		});

		test('is disabled if the new password does not match the password confirmation', async () => {
			const completeFirstTimeLogin = mount(
				<CompleteFirstTimeLogin match={MATCH} />,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completeFirstTimeLogin.update();

			const passwordInput = completeFirstTimeLogin.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);

			const passwordConfirmationInput = completeFirstTimeLogin.find(
				`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`,
			);

			passwordInput.simulate('change', {
				target: {
					name: 'password',
					value: 'newPassword',
				},
			});
			passwordConfirmationInput.simulate('change', {
				target: {
					name: 'passwordConfirmation',
					value: 'aDifferentPassword',
				},
			});

			const submitButton = completeFirstTimeLogin.find(
				`button[data-test="${DATA_TEST_PREFIX}__submit"]`,
			);

			expect(submitButton.prop('disabled')).toBe(true);
		});
	});

	test(
		'fires the completeFirstTimeLogin and then the addNotification action when the form is submitted -' +
			'redirects to login on success',
		async () => {
			const completeFirstTimeLoginAction = sandbox.stub();
			completeFirstTimeLoginAction.resolves(200);

			const addNotification = sandbox.stub(notifications, 'addNotification');

			const push = sandbox.stub();

			const completeFirstTimeLogin = mount(
				<CompleteFirstTimeLogin
					actions={{
						completeFirstTimeLogin: completeFirstTimeLoginAction,
					}}
					history={{
						push,
					}}
					match={MATCH}
				/>,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completeFirstTimeLogin.update();

			const passwordInput = completeFirstTimeLogin.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);
			const passwordConfirmationInput = completeFirstTimeLogin.find(
				`input[data-test="${DATA_TEST_PREFIX}__password-confirmation"]`,
			);

			passwordInput.simulate('change', {
				target: {
					name: 'password',
					value: 'newPassword',
				},
			});
			passwordConfirmationInput.simulate('change', {
				target: {
					name: 'passwordConfirmation',
					value: 'newPassword',
				},
			});

			const form = completeFirstTimeLogin.find(
				`form[data-test="${DATA_TEST_PREFIX}__form"]`,
			);
			form.simulate('submit', {
				target: {},
			});

			await flushPromises();
			completeFirstTimeLogin.update();

			expect(completeFirstTimeLoginAction.callCount).toBe(1);
			expect(addNotification.callCount).toBe(1);
			expect(addNotification.args).toEqual([
				['success', 'Successfully set password'],
			]);

			// Redirects to login
			expect(push.callCount).toBe(1);
			expect(push.args).toEqual([['/']]);

			completeFirstTimeLoginAction.reset();
			addNotification.reset();
			completeFirstTimeLoginAction.rejects(new Error('Could not update'));

			form.simulate('submit', {
				target: {},
			});

			await flushPromises();
			completeFirstTimeLogin.update();

			expect(completeFirstTimeLoginAction.callCount).toBe(1);
			expect(addNotification.callCount).toBe(1);
			expect(addNotification.args).toEqual([['danger', 'Could not update']]);
		},
	);
});
