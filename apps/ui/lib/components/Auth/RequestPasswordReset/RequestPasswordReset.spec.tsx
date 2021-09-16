/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { flushPromises, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import { notifications } from '@balena/jellyfish-ui-components';
import RequestPasswordReset from './RequestPasswordReset';

const DATA_TEST_PREFIX = 'requestPasswordReset-page';

const wrappingComponent = getWrapper().wrapper;

const sandbox = sinon.createSandbox();

describe('RequestPasswordReset', () => {
	afterEach(() => {
		sandbox.restore();
	});

	describe('Submit button', () => {
		test('is disabled if the username input is empty', async () => {
			const requestPasswordReset = mount(<RequestPasswordReset />, {
				wrappingComponent,
			});

			await flushPromises();

			const usernameInput = requestPasswordReset.find(
				`input[data-test="${DATA_TEST_PREFIX}__username"]`,
			);

			expect(usernameInput.prop('value')).toBe('');

			const submitButton = requestPasswordReset.find(
				`button[data-test="${DATA_TEST_PREFIX}__submit"]`,
			);

			expect(submitButton.prop('disabled')).toBe(true);
		});
	});

	test('fires the requirePasswordReset action followed by a success notification when the form is submitted', async () => {
		const username = 'fake@username.com';

		const requestPasswordResetAction = sandbox.stub();
		requestPasswordResetAction.resolves(200);

		const addNotification = sandbox.stub(notifications, 'addNotification');

		const requestPasswordReset = mount(
			<RequestPasswordReset
				actions={{
					requestPasswordReset: requestPasswordResetAction,
				}}
			/>,
			{
				wrappingComponent,
			},
		);

		await flushPromises();
		requestPasswordReset.update();

		const usernameInput = requestPasswordReset.find(
			`input[data-test="${DATA_TEST_PREFIX}__username"]`,
		);

		usernameInput.simulate('change', {
			target: {
				name: 'username',
				value: username,
			},
		});

		const form = requestPasswordReset.find(
			`form[data-test="${DATA_TEST_PREFIX}__form"]`,
		);
		form.simulate('submit', {
			target: {},
		});

		await flushPromises();
		requestPasswordReset.update();

		expect(requestPasswordResetAction.callCount).toBe(1);
		expect(addNotification.callCount).toBe(1);
		expect(addNotification.args).toEqual([
			['info', 'If this user exists, we have sent you a password reset email'],
		]);
	});

	test('sends a danger notification if the action throws an error', async () => {
		const username = 'fake@username.com';

		const requestPasswordResetAction = sandbox.stub();
		requestPasswordResetAction.rejects(new Error());

		const addNotification = sandbox.stub(notifications, 'addNotification');

		const requestPasswordReset = mount(
			<RequestPasswordReset
				actions={{
					requestPasswordReset: requestPasswordResetAction,
				}}
			/>,
			{
				wrappingComponent,
			},
		);

		await flushPromises();
		requestPasswordReset.update();

		const usernameInput = requestPasswordReset.find(
			`input[data-test="${DATA_TEST_PREFIX}__username"]`,
		);

		usernameInput.simulate('change', {
			target: {
				name: 'username',
				value: username,
			},
		});

		const form = requestPasswordReset.find(
			`form[data-test="${DATA_TEST_PREFIX}__form"]`,
		);
		form.simulate('submit', {
			target: {},
		});

		await flushPromises();
		requestPasswordReset.update();

		expect(requestPasswordResetAction.callCount).toBe(1);
		expect(addNotification.callCount).toBe(1);
		expect(addNotification.args).toEqual([
			[
				'danger',
				`Whoops! Something went wrong while trying to request a password reset for username ${username}`,
			],
		]);
	});
});
