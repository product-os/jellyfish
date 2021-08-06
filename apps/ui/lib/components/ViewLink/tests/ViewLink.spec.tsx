/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getWrapper } from '../../../../test/ui-setup';
import { shallow, mount } from 'enzyme';
import _ from 'lodash';
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
			shallow(<ViewLink user={user} card={view} />);
		}).not.toThrow();
	});

	test("removeView action called when 'Delete this view' button pressed and action confirmed", async () => {
		const actions = {
			removeView: sinon.fake(),
		};
		const component = await mount(
			<ViewLink isActive user={user} card={customView} actions={actions} />,
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
			<ViewLink isActive user={user} card={view} actions={actions} />,
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

	test('Contracts can be added to bookmarks', async () => {
		const sdk = {
			card: {
				link: sinon.fake(),
			},
		};
		const component = await mount(
			<ViewLink
				isActive
				isHomeView={false}
				user={user}
				card={customView}
				sdk={sdk}
			/>,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const bookmarkButton = component.find(
			'button[data-test="view-link--bookmark-btn"]',
		);
		expect(bookmarkButton.text()).toBe('Add to bookmarks');
		bookmarkButton.simulate('click');

		expect(sdk.card.link.calledOnce).toBe(true);
		const [from, to, verb] = sdk.card.link.getCall(0).args;
		expect(from.id).toBe(customView.id);
		expect(to.id).toBe(user.id);
		expect(verb).toBe('is bookmarked by');
	});

	test('Contracts can be removed from bookmarks', async () => {
		const sdk = {
			card: {
				unlink: sinon.fake(),
			},
		};
		const component = await mount(
			<ViewLink
				isActive
				isHomeView={false}
				user={user}
				card={_.merge({}, customView, {
					links: {
						'is bookmarked by': [user],
					},
				})}
				sdk={sdk}
			/>,
			{
				wrappingComponent,
			},
		);

		const contextMenuButton = component.find(
			'button[data-test="view-link--context-menu-btn"]',
		);
		contextMenuButton.simulate('click');

		const bookmarkButton = component.find(
			'button[data-test="view-link--bookmark-btn"]',
		);
		expect(bookmarkButton.text()).toBe('Remove from bookmarks');
		bookmarkButton.simulate('click');

		expect(sdk.card.unlink.calledOnce).toBe(true);
		const [from, to, verb] = sdk.card.unlink.getCall(0).args;
		expect(from.id).toBe(customView.id);
		expect(to.id).toBe(user.id);
		expect(verb).toBe('is bookmarked by');
	});

	test("'setDefault' action called with view as arg when 'Set as default' context menu item clicked", async () => {
		const actions = {
			setDefault: sinon.fake(),
		};
		const component = await mount(
			<ViewLink
				isActive
				isHomeView={false}
				user={user}
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
				user={user}
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
