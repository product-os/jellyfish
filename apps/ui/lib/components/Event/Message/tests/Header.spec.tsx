import { getWrapper } from '../../../../../test/ui-setup';
import sinon from 'sinon';
import { mount } from 'enzyme';
import React from 'react';
import Header from '../Header';
import { card } from './fixtures';

const wrappingComponent = getWrapper().wrapper;

const sandbox = sinon.createSandbox();

const context: any = {};

beforeEach(() => {
	context.commonProps = {
		isMessage: true,
		actor: {},
		card,
		threadIsMirrored: true,
		menuOptions: [],
		user: {
			slug: 'test-user',
		},
		updating: false,
		onEditMessage: sandbox.stub(),
	};
});

afterEach(() => {
	sandbox.restore();
});

test("'updating...' is displayed if card is updating and editing", async () => {
	const { commonProps } = context;
	const messageHeader = await mount(
		<Header {...commonProps} updating editing />,
		{
			wrappingComponent,
		},
	);
	const status = messageHeader.find('Txt[data-test="event-header__status"]');
	expect(status.text()).toBe('updating...');
});

test("'Edit Message' is not available if the user did not write the message", async () => {
	const { commonProps } = context;
	const messageHeader = await mount(<Header {...commonProps} />, {
		wrappingComponent,
	});

	const trigger = messageHeader.find(
		'button[data-test="event-header__context-menu-trigger"]',
	);
	trigger.simulate('click');
	messageHeader.update();

	// The 'Copy JSON' link is now shown but the 'Edit Message' link is not
	expect(
		messageHeader.find('a[data-test="event-header__link--copy-json"]').length,
	).toBeTruthy();
	expect(
		messageHeader.find('a[data-test="event-header__link--edit-message"]')
			.length,
	).toBeFalsy();
});

test("Clicking 'Edit Message' calls the onEditMessage prop callback", async () => {
	const { commonProps } = context;
	const messageHeader = await mount(
		<Header
			{...commonProps}
			user={{
				id: card.data.actor,
			}}
		/>,
		{
			wrappingComponent,
		},
	);

	const trigger = messageHeader.find(
		'button[data-test="event-header__context-menu-trigger"]',
	);
	trigger.simulate('click');
	messageHeader.update();

	expect(commonProps.onEditMessage.callCount).toBe(0);
	messageHeader
		.find('a[data-test="event-header__link--edit-message"]')
		.simulate('click');
	expect(commonProps.onEditMessage.callCount).toBe(1);
});
