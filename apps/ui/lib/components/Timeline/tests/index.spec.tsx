import Bluebird from 'bluebird';
import sinon from 'sinon';
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import {
	timestamp,
	createTestContext,
	wrapperWithSetup,
	flushPromises,
} from './helpers';
import Timeline from '../';

const sandbox = sinon.createSandbox();

let context: any = {};

beforeEach(() => {
	context = createTestContext(test, sandbox);
});

afterEach(() => {
	sandbox.restore();
});

test(
	'The TimelineStart component is rendered' +
		' when all the events in the timeline have been returned and rendered',
	async () => {
		const { eventProps } = context;

		const timeline = await mount(<Timeline {...eventProps} tail={[]} />, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk,
			},
		});

		const timelineStart = timeline.find(
			'div[data-test="Timeline__TimelineStart"]',
		);
		expect(timelineStart.text()).toBe('Beginning of Timeline');
	},
);

test('Events are ordered by either timestamp or created_at date', async () => {
	const {
		eventProps: { ...props },
	} = context;

	const date = new Date(timestamp);
	const oldTimestamp = date.getTime() - 1;

	const tail = _.map(_.range(19), (i: number) => {
		return {
			id: `fake-event-id-${i}`,
			type: 'message@1.0.0',
			slug: `message-${i}`,
			data: {
				readBy: [],
			},
		};
	});

	const link = {
		id: 'fake-link-id',
		slug: 'fake-link-slug',
		type: 'link@1.0.0',
		created_at: new Date(oldTimestamp).toISOString(),
		data: {
			to: {
				id: 'fake-card-id',
				type: 'user@1.0.0',
			},
			from: {
				id: 'fake-linked-card-id',
				type: 'org@1.0.0',
			},
		},
	};

	const wrapper = await mount(<Timeline {...props} tail={[...tail, link]} />, {
		wrappingComponent: wrapperWithSetup,
		wrappingComponentProps: {
			sdk: props.sdk,
		},
	});

	const timeline: any = wrapper.childAt(0).instance();

	timeline.handleEventToggle();

	await flushPromises();
	wrapper.update();

	const events = wrapper.find('div[data-test]');
	const firstEvent = events.get(1).props;
	console.log(firstEvent['data-test']);
	expect(firstEvent['data-test']).toBe(link.id);
});

test('Events are toggled when the event in the url is one of type UPDATE', async () => {
	const { eventProps } = context;

	const eventId = 'fake-update-id';

	// eslint-disable-next-line prefer-reflect
	Reflect.deleteProperty(window, 'location');

	// @ts-ignore
	global.window.location = {
		search: `?event=${eventId}`,
	};

	const wrapper = await mount(
		<Timeline
			{...eventProps}
			tail={[
				{
					id: eventId,
					type: 'update@1.0.0',
					data: {
						payload: [],
						timestamp,
					},
				},
			]}
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk,
			},
		},
	);
	await Bluebird.delay(2500);

	const timeline = wrapper.childAt(0);

	expect(timeline.state('messagesOnly')).toBe(false);
}, 25001);

test('Events are toggled when the event in the url is one of type CREATE', async () => {
	const { eventProps } = context;

	const eventId = 'fake-create-id';

	// eslint-disable-next-line prefer-reflect
	Reflect.deleteProperty(window, 'location');

	// @ts-ignore
	global.window.location = {
		search: `?event=${eventId}`,
	};

	const wrapper = await mount(
		<Timeline
			{...eventProps}
			tail={[
				{
					id: eventId,
					type: 'create@1,0,0',
					data: {
						readBy: [],
						timestamp,
					},
				},
			]}
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk,
			},
		},
	);

	await Bluebird.delay(2500);
	const timeline = wrapper.childAt(0);

	expect(timeline.state('messagesOnly')).toBe(false);
}, 25001);

test('A message is not removed from the pendingMessage list until it has been added to the tail', async () => {
	const { eventProps } = context;

	const createMessage = sandbox.stub();
	createMessage.resolves();

	const wrapper = await mount(
		<Timeline
			{...eventProps}
			setTimelineMessage={_.noop}
			tail={[]}
			sdk={{
				event: {
					create: createMessage,
				},
			}}
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk,
			},
		},
	);

	const timeline: any = wrapper.childAt(0).instance();

	await timeline.addMessage('Here is a new message', false);

	const pendingMessages = timeline.state.pendingMessages;
	expect(pendingMessages.length).toBe(1);

	// Simulate the stream returning the pending message as part of the tail
	wrapper.setProps({
		tail: [pendingMessages[0]],
	});

	await flushPromises();
	wrapper.update();

	const updatedPendingMessages = timeline.state.pendingMessages;
	expect(updatedPendingMessages.length).toBe(0);
});
