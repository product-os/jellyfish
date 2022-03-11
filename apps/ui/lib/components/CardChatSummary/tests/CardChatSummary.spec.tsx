import { flushPromises, getWrapper } from '../../../../test/ui-setup';
import _ from 'lodash';
import { shallow, mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import { CardChatSummary } from '..';
import theme from './fixtures/theme.json';
import card from './fixtures/card.json';
import inlineImageMsg from './fixtures/msg-inline-image.json';
import user1 from './fixtures/user-1.json';
import user2 from './fixtures/user-2.json';
import * as helpers from '../../../services/helpers';

const sandbox = sinon.createSandbox();

let context: any = {};

const getActor = async (id: any) => {
	if (id === user1.id) {
		return user1;
	}

	return user2;
};

const getTimeline = (target: any) => {
	return _.sortBy(
		_.get(target.links, ['has attached element'], []),
		'data.timestamp',
	);
};

const wrappingComponent = getWrapper(
	{},
	{
		getCard: sandbox.stub(),
		selectCard: sandbox.stub().returns(sandbox.stub().returns(user2)),
	},
).wrapper;

beforeEach(() => {
	const getActorSpy = sandbox.spy(getActor);
	context = {
		...context,
		commonProps: {
			active: true,
			card,
			theme,
			timeline: getTimeline(card),
			getActor: getActorSpy,
		},
	};
});

afterEach(() => {
	sandbox.restore();
});

test('It should render', () => {
	const { commonProps } = context;

	expect(() => {
		shallow(<CardChatSummary {...commonProps} />);
	}).not.toThrow();
});

test('It should use the lastMessage field on the card, if set', async () => {
	const { commonProps } = context;

	const lastMessage = _.findLast(commonProps.timeline, (event) => {
		const typeBase = helpers.getTypeBase(event.type);
		return typeBase === 'message' || typeBase === 'whisper';
	});

	const cardWithLastMessage = _.merge({}, commonProps.card, {
		data: {
			lastMessage,
		},
	});

	const props = {
		..._.omit(commonProps, 'card', 'timeline'),
		card: cardWithLastMessage,
	};

	const component = await mount(<CardChatSummary {...props} />, {
		wrappingComponent,
	});

	const messageSummary = component.find(
		'div[data-test="card-chat-summary__message"]',
	);
	const messageSummaryText = messageSummary.text();
	expect(messageSummaryText.trim()).toBe(lastMessage.data.payload.message);
});

test('It should change the actor after an update', async () => {
	const { commonProps } = context;

	const component: any = shallow(<CardChatSummary {...commonProps} />);

	// Check if getActor is used
	expect(commonProps.getActor.callCount).toBe(1);

	const newWhisper = {
		id: 'acbfc1ec-bf55-44aa-9361-910f52df3c05',
		data: {
			actor: '713a47bb-74f4-4506-ada7-e5b4060b8b6a',
			target: 'd967c40b-7495-4132-b2ff-16d16259d783',
			payload: {
				message: 'x',
				alertsUser: [],
				mentionsUser: [],
				alertsGroup: [],
				mentionsGroup: [],
			},
			timestamp: '2019-05-31T13:45:00.300Z',
		},
		name: null,
		slug: 'whisper-c643e8ee-df73-4592-b9d3-7c6e4f5ca72e',
		tags: [],
		type: 'whisper@1.0.0',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		linked_at: {
			'is attached to': '2019-05-31T13:45:00.783Z',
		},
		created_at: '2019-05-31T13:45:00.548Z',
		updated_at: null,
		capabilities: [],
	};

	// Add the new whisper to the current
	// timeline and sort it by timestamp
	component.setProps({
		timeline: _.sortBy([...commonProps.timeline, newWhisper], 'data.timestamp'),
	});

	component.update();
	await flushPromises();

	expect(component.state('actor').id).toBe(newWhisper.data.actor);
});

test('Inline messages are transformed to a text representation', async () => {
	const { commonProps } = context;

	const component = await mount(
		<CardChatSummary {...commonProps} timeline={[inlineImageMsg]} />,
		{
			wrappingComponent,
		},
	);
	const messageSummary = component.find(
		'div[data-test="card-chat-summary__message"]',
	);
	const messageSummaryText = messageSummary.text();
	expect(messageSummaryText.trim()).toBe('[some-image.png]');
});

test('Links are transformed to use the Link component', async () => {
	const { commonProps } = context;

	const component = await mount(
		<CardChatSummary {...commonProps} timeline={[inlineImageMsg]} />,
		{
			wrappingComponent,
		},
	);
	const messageSummary = component.find(
		'div[data-test="card-chat-summary__message"]',
	);

	const link = messageSummary.find('Link').first();
	expect(link.props().to).toBe('https://via.placeholder.com/150');
});
