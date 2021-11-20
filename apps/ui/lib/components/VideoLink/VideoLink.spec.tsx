import { getPromiseResolver, getWrapper } from '../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { notifications } from '@balena/jellyfish-ui-components';
import VideoLink from './VideoLink';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper().wrapper;

const conferenceUrl = 'https://meet.google.com/some-meeting-code';

const card = {
	id: '1',
	type: 'user@1.0.0',
};

const types = [
	{
		id: '1',
		slug: 'user',
		name: 'User',
		version: '1.0.0',
	},
];

const theme = {
	colors: {
		text: {
			main: '#2A506F',
		},
		gray: {
			dark: '#9F9F9F',
		},
	},
};

let context: any = {};

describe('VideoLink', () => {
	beforeEach(async () => {
		const sdk = {
			action: sandbox.fake.resolves({
				conferenceUrl,
			}),
		};

		context = {
			commonProps: {
				sdk,
				theme,
				types,
			},
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('Clicking on the link sends a google-meet action and then opens the link', async () => {
		const { commonProps } = context;

		// This technique lets us wait until we know for sure the window.open method has
		// been called and we have stored the url argment
		let openedUrl = null;
		const windowOpen = getPromiseResolver() as any;
		(window as any).open = (url) => {
			openedUrl = url;
			windowOpen.resolver(url);
		};

		const videoLink = await mount(<VideoLink card={card} {...commonProps} />, {
			wrappingComponent,
		});

		videoLink.find('BaseLink').simulate('click');

		// Wait for the window.open method to be called
		await windowOpen.promise;

		expect(commonProps.sdk.action.lastArg).toEqual({
			card: card.id,
			action: 'action-google-meet@1.0.0',
			type: card.type,
			arguments: {},
		});
		expect(openedUrl).toBe(conferenceUrl);
	});

	test('An error notification is shown if the google-meet action fails', async () => {
		const { commonProps } = context;

		let notificationType = '';
		const addNotificationPromise = getPromiseResolver();
		sandbox
			.stub(notifications, 'addNotification')
			.callsFake((type, content, options) => {
				notificationType = type;
				addNotificationPromise.resolver();
				return 0;
			});

		commonProps.sdk.action = sandbox.fake.rejects('TestError');

		const videoLink = await mount(<VideoLink card={card} {...commonProps} />, {
			wrappingComponent,
		});

		videoLink.find('BaseLink').simulate('click');

		// Wait for the addNotification method to be called
		await addNotificationPromise.promise;
		expect(notificationType).toBe('danger');
	});
});
