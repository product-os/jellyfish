jest.mock('../../common/RelationshipsTab');
jest.mock('../../../components/BookmarkButton');

import { getWrapper, flushPromises } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';

// TODO: Remove this unused import if we resolve the circular dependency
// eslint-disable-next-line no-unused-vars
import full from '..';
import User from './User';

const { wrapper } = getWrapper({
	core: {
		types: [
			{
				slug: 'user',
				type: 'type@1.0.0',
				version: '1.0.0',
			},
		],
	},
});

const BALENA_ORG = {
	slug: 'org-balena',
	type: 'org@1.0.0',
};

const USER = {
	slug: 'user-operator',
	type: 'user@1.0.0',
};

const CARD = {
	slug: 'user-hannahmontana',
	type: 'user@1.0.0',
	data: {
		roles: ['user-community'],
	},
};

const sandbox = sinon.createSandbox();
const context: any = {};

beforeEach(() => {
	const sdk = {
		query: sandbox.stub(),
		card: {
			update: sandbox.stub(),
			unlink: sandbox.stub(),
		},
	};
	context.userProps = {
		sdk,
		balenaOrg: BALENA_ORG,
		card: CARD,
		user: USER,
		actions: {
			sendFirstTimeLoginLink: sandbox.stub(),
		},
	};
});

afterEach(() => {
	sandbox.restore();
});

test(
	'actionItem "send first-time login link"  can be used to fire' +
		' the sendFirstTimeLoginLink action when the user has an operator role',
	async () => {
		const { userProps } = context;
		userProps.sdk.query.resolves([
			{
				...USER,
				data: {
					roles: ['user-community', 'user-operator'],
				},
			},
		]);

		const component = mount(<User {...userProps} />, {
			wrappingComponent: wrapper,
		});

		await flushPromises();
		component.update();

		const actionMenu = component.find('button[data-test="card-action-menu"]');
		actionMenu.simulate('click');

		const sendFirstTimeLoginLink = component.find(
			'a[data-test="card-action-menu__send-first-time-login"]',
		);
		expect(sendFirstTimeLoginLink).toHaveLength(1);

		sendFirstTimeLoginLink.simulate('click');

		expect(userProps.actions.sendFirstTimeLoginLink.callCount).toBe(1);
		expect(userProps.actions.sendFirstTimeLoginLink.args).toStrictEqual([
			[
				{
					user: CARD,
				},
			],
		]);
	},
);

test(
	'actionItem "Offboard user"  can be used to update' +
		" the user's card and link to org when the user has an operator role",
	async () => {
		const { userProps } = context;

		userProps.sdk.query.resolves([
			{
				...USER,
				data: {
					roles: ['user-community', 'user-operator'],
				},
			},
		]);

		const component = mount(<User {...userProps} />, {
			wrappingComponent: wrapper,
		});

		await flushPromises();
		component.update();

		const actionMenu = component.find('button[data-test="card-action-menu"]');
		actionMenu.simulate('click');

		const offboardUserLink = component.find(
			'a[data-test="card-action-menu__offboard-user"]',
		);
		expect(offboardUserLink).toHaveLength(1);

		offboardUserLink.simulate('click');

		await flushPromises();
		component.update();

		expect(userProps.sdk.card.update.callCount).toBe(1);
		expect(userProps.sdk.card.update.getCall(0).args[2]).toStrictEqual([
			{
				op: 'replace',
				path: '/data/roles/0',
				value: 'user-external-support',
			},
		]);

		expect(userProps.sdk.card.unlink.callCount).toBe(1);
		const unlinkCallArgs = userProps.sdk.card.unlink.getCall(0).args;
		expect(unlinkCallArgs[0].slug).toBe(CARD.slug);
		expect(unlinkCallArgs[1].slug).toBe(BALENA_ORG.slug);
		expect(unlinkCallArgs[2]).toBe('is member of');
	},
);

test(
	'actionItem "send first-time login link"  does not appear ' +
		'in the action menu when the user has no operator role',
	async () => {
		const { userProps } = context;

		userProps.sdk.query.resolves([
			{
				...USER,
				data: {
					roles: ['user-community'],
				},
			},
		]);

		const component = mount(<User {...userProps} />, {
			wrappingComponent: wrapper,
		});
		await flushPromises();
		component.update();

		const actionMenu = component.find('button[data-test="card-action-menu"]');
		actionMenu.simulate('click');

		const sendFirstTimeLoginLink = component.find(
			'a[data-test="card-action-menu__send-first-time-login"]',
		);
		expect(sendFirstTimeLoginLink).toHaveLength(0);
	},
);

test(
	'actionItem "Offboard user"  does not appear ' +
		'in the action menu when the user has no operator role',
	async () => {
		const { userProps } = context;

		userProps.sdk.query.resolves([
			{
				...USER,
				data: {
					roles: ['user-community'],
				},
			},
		]);

		const component = mount(<User {...userProps} />, {
			wrappingComponent: wrapper,
		});
		await flushPromises();
		component.update();

		const actionMenu = component.find('button[data-test="card-action-menu"]');
		actionMenu.simulate('click');

		const offboardUserLink = component.find(
			'a[data-test="card-action-menu__offboard-user"]',
		);
		expect(offboardUserLink).toHaveLength(0);
	},
);
