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

test(
	'Only messages, whispers, and update cards without name values are ' +
		'displayed when the messagesOnly field is set',
	async () => {
		const {
			eventProps: { tail, ...props },
			createEvent,
			whisperEvent,
			messageEvent,
			updateEvent,
		} = context;

		const eventsList = await mount(
			<EventsList {...props} messagesOnly sortedEvents={tail} />,
			{
				wrappingComponent: wrapperWithSetup,
				wrappingComponentProps: {
					sdk: props.sdk,
				},
			},
		);
		const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`);
		const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`);
		const update = eventsList.find(`div[data-test="${updateEvent.id}"]`);
		const create = eventsList.find(`div[data-test="${createEvent.id}"]`);

		expect(messages.length).toBe(1);
		expect(whispers.length).toBe(1);
		expect(update.length).toBe(0);
		expect(create.length).toBe(0);
	},
);

test('Updates are displayed when the messagesOnly field is set IF they have a name value', async () => {
	const {
		eventProps: { tail, ...props },
		updateEvent,
	} = context;

	updateEvent.name = 'Some reason for existing';

	const eventsList = await mount(
		<EventsList {...props} messagesOnly sortedEvents={tail} />,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: props.sdk,
			},
		},
	);
	const update = eventsList.find(`div[data-test="${updateEvent.id}"]`);

	expect(update.length).toBe(1);
});

test('Whispers are not shown if hideWhispers is set', async () => {
	const {
		eventProps: { tail, ...props },
		whisperEvent,
		messageEvent,
	} = context;

	const eventsList = await mount(
		<EventsList {...props} hideWhispers messagesOnly sortedEvents={tail} />,
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

test('All events are shown if messagesOnly and hideWhispers are not set', async () => {
	const {
		eventProps: { tail, card, ...props },
		whisperEvent,
		messageEvent,
		updateEvent,
		createEvent,
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
	const update = eventsList.find(`div[data-test="${updateEvent.id}"]`);
	const create = eventsList.find(`div[data-test="${createEvent.id}"]`);

	expect(messages.length).toBe(1);
	expect(whispers.length).toBe(1);
	expect(update.length).toBe(1);
	expect(create.length).toBe(1);
});
