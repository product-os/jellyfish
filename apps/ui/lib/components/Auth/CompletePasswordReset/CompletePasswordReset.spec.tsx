import { flushPromises, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import { notifications } from '@balena/jellyfish-ui-components';
import CompletePasswordReset from './CompletePasswordReset';

const DATA_TEST_PREFIX = 'completePasswordReset-page';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper().wrapper;

describe('CompletePasswordReset', () => {
	afterEach(() => {
		sandbox.restore();
	});

	describe('Submit button', () => {
		test('is disabled if the new password input is empty', async () => {
			const completePasswordReset = mount(
				<CompletePasswordReset
					match={{
						resetToken: '123456',
					}}
				/>,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completePasswordReset.update();

			const passwordInput = completePasswordReset.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);

			expect(passwordInput.prop('value')).toBe('');

			const submitButton = completePasswordReset.find(
				`button[data-test="${DATA_TEST_PREFIX}__submit"]`,
			);

			expect(submitButton.prop('disabled')).toBe(true);
		});

		test('is disabled if the new password does not match the password confirmation', async () => {
			const completePasswordReset = mount(
				<CompletePasswordReset
					match={{
						params: {
							resetToken: '1234567',
						},
					}}
				/>,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completePasswordReset.update();

			const passwordInput = completePasswordReset.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);

			const passwordConfirmationInput = completePasswordReset.find(
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

			const submitButton = completePasswordReset.find(
				`button[data-test="${DATA_TEST_PREFIX}__submit"]`,
			);

			expect(submitButton.prop('disabled')).toBe(true);
		});
	});

	test(
		'fires the completePasswordReset and then the addNotification action when the form is submitted -' +
			'redirects to login on success',
		async () => {
			const completePasswordResetAction = sandbox.stub();
			completePasswordResetAction.resolves(200);

			const addNotification = sandbox.stub(notifications, 'addNotification');

			const push = sandbox.stub();

			const completePasswordReset = mount(
				<CompletePasswordReset
					actions={{
						completePasswordReset: completePasswordResetAction,
					}}
					history={{
						push,
					}}
					match={{
						params: {
							resetToken: '1234567',
						},
					}}
				/>,
				{
					wrappingComponent,
				},
			);

			await flushPromises();
			completePasswordReset.update();

			const passwordInput = completePasswordReset.find(
				`input[data-test="${DATA_TEST_PREFIX}__password"]`,
			);
			const passwordConfirmationInput = completePasswordReset.find(
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

			const form = completePasswordReset.find(
				`form[data-test="${DATA_TEST_PREFIX}__form"]`,
			);
			form.simulate('submit', {
				target: {},
			});

			await flushPromises();
			completePasswordReset.update();

			expect(completePasswordResetAction.callCount).toBe(1);
			expect(addNotification.callCount).toBe(1);
			expect(addNotification.args).toEqual([
				['success', 'Successfully reset password'],
			]);

			// Redirects to login
			expect(push.callCount).toBe(1);
			expect(push.args).toEqual([['/']]);

			completePasswordResetAction.reset();
			addNotification.reset();
			completePasswordResetAction.rejects(new Error('Could not update'));

			form.simulate('submit', {
				target: {},
			});

			await flushPromises();
			completePasswordReset.update();

			expect(completePasswordResetAction.callCount).toBe(1);
			expect(addNotification.callCount).toBe(1);
			expect(addNotification.args).toEqual([['danger', 'Could not update']]);
		},
	);
});
