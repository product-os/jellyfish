import { getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import React from 'react';
import _ from 'lodash';
import sinon from 'sinon';
import HomeChannel from '../HomeChannel';
import * as homeChannelProps from './fixtures';
import type { Contract } from '@balena/jellyfish-types/build/core';

let context: any = {};

const sandbox = sinon.createSandbox();

const initialState = {
	core: {
		session: {
			user: {},
		},
		loops: [],
	},
};

describe('HomeChannel', () => {
	beforeEach(async () => {
		context = {
			actions: _.reduce(
				[
					'addChannel',
					'logout',
					'queryAPI',
					'removeView',
					'removeViewNotice',
					'setChatWidgetOpen',
					'setDefault',
					'setSidebarExpanded',
					'streamView',
					'updateUser',
					'loadViewData',
				],
				(acc, action) => {
					acc[action] = sandbox.stub();
					return acc;
				},
				{},
			),
			history: {
				push: sandbox.stub(),
			},
		};
		context.actions.queryAPI.resolves([]);
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('Bookmarks appear in their own menu section', async () => {
		const { wrapper } = getWrapper(initialState);
		const homeChannel = await mount(
			<HomeChannel
				{...homeChannelProps}
				channels={[homeChannelProps.channel]}
				actions={context.actions}
				viewNotices={{}}
				subscriptions={{}}
				orgs={[]}
				history={context.history}
				location={{
					pathname: '/some-view',
				}}
			/>,
			{
				wrappingComponent: wrapper,
			},
		);

		const bookmarksDiv = homeChannel.find(
			'div[data-test="home-channel__group__bookmarks"]',
		);

		_.forEach(homeChannelProps.bookmarks, (bookmark: Contract) => {
			const bookmarkLink = bookmarksDiv.find(
				`a[data-test="home-channel__item--${bookmark.slug}"]`,
			);
			expect(bookmarkLink.length).toBe(1);
		});
	});

	test('The home view is loaded on mount if set', async () => {
		const homeView = 'view-123';
		const { wrapper } = getWrapper(initialState);
		await mount(
			<HomeChannel
				{...homeChannelProps}
				channels={[homeChannelProps.channel]}
				actions={context.actions}
				viewNotices={{}}
				subscriptions={{}}
				orgs={[]}
				homeView={homeView}
				history={context.history}
				location={{
					pathname: '/',
				}}
			/>,
			{
				wrappingComponent: wrapper,
			},
		);

		expect(context.history.push.calledOnce).toBe(true);
		expect(context.history.push.getCall(0).args[0]).toEqual(homeView);
	});
});
