/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getWrapper } from '../../../../test/ui-setup';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import ViewLink from '../ViewLink';
import view from './fixtures/all-messages-view.json';
import customView from './fixtures/custom-view.json';
import user from './fixtures/user.json';

const wrappingComponent = getWrapper().wrapper;

describe('ViewLink', () => {
	test('should render', () => {
		expect(() => {
			shallow(<ViewLink userSlug={user.slug} card={view} />);
		}).not.toThrow();
	});

	test("removeView action called when 'Delete this view' button pressed and action confirmed", async () => {
		const actions = {
			removeView: sinon.fake(),
		};
		const component = await mount(
			<ViewLink
				isActive
				userSlug={user.slug}
				card={customView}
				actions={actions}
			/>,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const deleteViewButton = component.find(
			'button[data-test="view-link--delete-view-btn"]',
		);
		deleteViewButton.simulate('click');

		const confirmButton = component.find(
			'button[data-test="view-delete__submit"]',
		);
		confirmButton.simulate('click');

		expect(actions.removeView.calledOnce).toBe(true);
		expect(actions.removeView.getCall(0).lastArg.id).toBe(customView.id);
	});

	test("'Delete this view' button not shown if view is not a valid custom view", async () => {
		const actions = {
			removeView: sinon.fake(),
		};
		const component = await mount(
			<ViewLink isActive userSlug={user.slug} card={view} actions={actions} />,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const deleteViewButton = component.find(
			'button[data-test="view-link--delete-view-btn"]',
		);
		expect(deleteViewButton.length).toBe(0);
	});

	test("'setDefault' action called with view as arg when 'Set as default' context menu item clicked", async () => {
		const actions = {
			setDefault: sinon.fake(),
		};
		const component = await mount(
			<ViewLink
				isActive
				isHomeView={false}
				userSlug={user.slug}
				card={customView}
				actions={actions}
			/>,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const setDefaultButton = component.find(
			'button[data-test="view-link--set-default-btn"]',
		);
		expect(setDefaultButton.text()).toBe('Set as default');
		setDefaultButton.simulate('click');

		expect(actions.setDefault.calledOnce).toBe(true);
		expect(actions.setDefault.getCall(0).args[0].id).toBe(customView.id);
	});

	test("'setDefault' action called with null as arg when 'Unset as default' context menu item clicked", async () => {
		const actions = {
			setDefault: sinon.fake(),
		};
		const component = await mount(
			<ViewLink
				isActive
				isHomeView
				userSlug={user.slug}
				card={customView}
				actions={actions}
			/>,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const setDefaultButton = component.find(
			'button[data-test="view-link--set-default-btn"]',
		);
		expect(setDefaultButton.text()).toBe('Unset as default');
		setDefaultButton.simulate('click');

		expect(actions.setDefault.calledOnce).toBe(true);
		expect(actions.setDefault.getCall(0).args[0]).toBeNull();
	});
});
