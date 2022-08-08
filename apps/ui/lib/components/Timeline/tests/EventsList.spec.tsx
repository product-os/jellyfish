import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { createTestContext, wrapperWithSetup } from './helpers';
import EventsList from '../EventsList';

const sandbox = sinon.createSandbox();

let context: any = {};

beforeAll(() => {
	context = createTestContext(test, sandbox);
});

test('Whispers are not shown if hideWhispers is set', async () => {
	const {
		eventProps: { tail, ...props },
		whisperEvent,
		messageEvent,
	} = context;

	const eventsList = await mount(
		<EventsList {...props} hideWhispers sortedEvents={tail} />,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: props.sdk,
			},
		},
	);

	const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`);
	const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`);

	expect(messages.length).toBe(1);
	expect(whispers.length).toBe(0);
});

test('All events are shown if hideWhispers is not set', async () => {
	const {
		eventProps: { tail, card, ...props },
		whisperEvent,
		messageEvent,
	} = context;

	const eventsList = await mount(
		<EventsList {...props} targetCard={card} sortedEvents={tail} />,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: props.sdk,
			},
		},
	);

	const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`);
	const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`);

	expect(messages.length).toBe(1);
	expect(whispers.length).toBe(1);
});
