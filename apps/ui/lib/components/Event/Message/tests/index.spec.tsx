import { getWrapper } from '../../../../../test/ui-setup';
import sinon from 'sinon';
import { shallow, mount } from 'enzyme';
import React from 'react';
import { Markdown } from 'rendition/dist/extra/Markdown';
import Message from '../';
import { highlightTags } from '../Mention';
import { card } from './fixtures';

// HACK to get react-textarea-autosize not to complain
// @ts-ignore
global.getComputedStyle = global.window.getComputedStyle = () => {
	return {
		height: '100px',
		getPropertyValue: (name) => {
			return name === 'box-sizing' ? '' : null;
		},
	};
};

const user = {
	slug: 'user-johndoe',
	data: {
		profile: {
			name: {
				first: 'john',
				last: 'doe',
			},
		},
	},
};

const username = user.slug.slice(5);

const otherUser = {
	slug: 'user-johndoe1',
};

const myGroup = 'group1';
const otherGroup = 'group11';
const tag = 'johndoe';

const actor = {
	name: 'johndoe',
	email: 'johndoe@example.com',
	proxy: false,
	card: {
		data: {
			email: 'johndoe@example.com',
		},
	},
};

const groups = {
	[myGroup]: {
		users: [user.slug],
		name: myGroup,
		isMine: true,
	},
	[otherGroup]: {
		users: [otherUser.slug],
		name: otherGroup,
	},
};

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper(
	{},
	{
		getCard: sandbox.stub(),
		selectCard: sandbox.stub().returns(sandbox.stub().returns(user)),
	},
).wrapper;

const commonProps = {
	user,
	actor,
};

const testHighlightTags = ({ text, readBy = [], expectedClassName }: any) => {
	const element: any = {
		innerText: text,
		className: 'rendition-tag--hl',
		setAttribute: sandbox.fake(),
	};
	highlightTags(element, readBy, username, groups);
	expect(element.className).toBe(expectedClassName);
	return element;
};

const editMessage = (event: any, newMessage: any) => {
	event
		.find('button[data-test="event-header__context-menu-trigger"]')
		.simulate('click');
	event
		.find('a[data-test="event-header__link--edit-message"]')
		.simulate('click');
	const autocomplete = event.find('AutoCompleteArea');

	// Force the change via the props (avoid interaction with react-textarea-autosize)
	autocomplete.props().onChange({
		target: {
			value: newMessage,
		},
	});
	autocomplete.props().onSubmit();
};

afterEach(() => {
	sandbox.restore();
});

test('It should render', () => {
	expect(() => {
		shallow(<Message {...(commonProps as any)} card={card} />);
	}).not.toThrow();
});

test.skip("The event is marked as 'focused' if the card's ID matches the 'event' url param", () => {
	window.location.search = `?event=${card.id}`;
	const event = mount(<Message {...(commonProps as any)} card={card} />, {
		wrappingComponent,
	});
	const eventWrapper = event.find(`div#event-${card.id}`);
	expect(eventWrapper.hasClass('event--focused')).toBe(true);
});

test("It should display the actor's details", () => {
	const event = mount(<Message {...(commonProps as any)} card={card} />, {
		wrappingComponent,
	});
	const avatar: any = event.find('BaseAvatar');
	expect(avatar.props().firstName).toBe(user.data.profile.name.first);
	expect(avatar.props().lastName).toBe(user.data.profile.name.last);
	const actorLabel: any = event.find('Txt[data-test="event__actor-label"]');
	expect(actorLabel.props().tooltip).toBe(actor.email);
});

test('A markdown message is displayed when the card is a message', async () => {
	const messageText = 'fake message text';
	const messageCard = {
		...card,
		type: 'message@1.0.0',
		data: {
			payload: {
				message: messageText,
			},
		},
	};
	const event = mount(
		<Message {...(commonProps as any)} card={messageCard} />,
		{
			wrappingComponent,
		},
	);
	const message = event.find(Markdown);
	expect(message.text().trim()).toBe(messageText);
});

test('Editing a message will update the mentions, alerts, tags and message', async () => {
	const author = {
		...user,
		id: card.data.actor,
	};
	const mentionSlug = 'john';
	const alertSlug = 'paul';
	const mentionGroup = 'group1';
	const alertGroup = 'group2';
	const newMessage = `Test @${mentionSlug} !${alertSlug} @@${mentionGroup} !!${alertGroup} #${tag}`;
	const expectedPatches = {
		'/tags/0': {
			op: 'add',
			path: '/tags/0',
			value: tag,
		},
		'/data/payload/mentionsUser/0': {
			op: 'add',
			path: '/data/payload/mentionsUser/0',
			value: `user-${mentionSlug}`,
		},
		'/data/payload/alertsUser/0': {
			op: 'add',
			path: '/data/payload/alertsUser/0',
			value: `user-${alertSlug}`,
		},
		'/data/payload/mentionsGroup/0': {
			op: 'add',
			path: '/data/payload/mentionsGroup/0',
			value: mentionGroup,
		},
		'/data/payload/alertsGroup/0': {
			op: 'add',
			path: '/data/payload/alertsGroup/0',
			value: alertGroup,
		},
		'/data/payload/message': {
			op: 'replace',
			path: '/data/payload/message',
			value: newMessage,
		},
	};

	const onUpdateCard = sandbox.stub().resolves(null);

	const event = await mount(
		<Message
			{...(commonProps as any)}
			onUpdateCard={onUpdateCard}
			user={author as any}
			card={card}
		/>,
		{
			wrappingComponent,
		},
	);

	editMessage(event, newMessage);

	// Verify the onUpdateCard prop callback is called with the expected patch
	expect(onUpdateCard.callCount).toBe(1);
	expect(onUpdateCard.getCall(0).args[0].id).toBe(card.id);

	// Use a Set here as we can't be sure of the order of patches in the patch array
	const updatePatches = onUpdateCard
		.getCall(0)
		.args[1].reduce((acc: any, patch: any) => {
			acc[patch.path] = patch;
			return acc;
		}, {});
	expect(updatePatches).toEqual(expectedPatches);
});

test('You can delete the whole content of a message when editing it', async () => {
	const author = {
		...user,
		id: card.data.actor,
	};
	const expectedPatches = [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: '',
		},
	];

	const onUpdateCard = sandbox.stub().resolves(null);

	const event = await mount(
		<Message
			{...(commonProps as any)}
			onUpdateCard={onUpdateCard}
			user={author as any}
			card={card}
		/>,
		{
			wrappingComponent,
		},
	);

	editMessage(event, '');

	// Verify the onUpdateCard prop callback is called with the expected patch
	expect(onUpdateCard.callCount).toBe(1);
	expect(onUpdateCard.getCall(0).args[0].id).toBe(card.id);
	expect(onUpdateCard.getCall(0).args[1]).toEqual(expectedPatches);
});

test("If user mention matches the authenticated user it is identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `@${username}`,
		expectedClassName: 'rendition-tag--hl rendition-tag--personal',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If user mention does not match the authenticated user it is not identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `@${otherUser.slug.slice(5)}`,
		expectedClassName: 'rendition-tag--hl',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If user alert matches the authenticated user it is identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `!${username}`,
		expectedClassName:
			'rendition-tag--hl rendition-tag--personal rendition-tag--alert',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If user alert does not match the authenticated user it is not identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `!${otherUser.slug.slice(5)}`,
		expectedClassName: 'rendition-tag--hl rendition-tag--alert',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If group mention matches the authenticated user it is identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `@@${myGroup}`,
		expectedClassName: 'rendition-tag--hl rendition-tag--personal',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If group mention does not match the authenticated user it is not identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `@@${otherGroup}`,
		expectedClassName: 'rendition-tag--hl',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If group alert matches the authenticated user it is identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `!!${myGroup}`,
		expectedClassName:
			'rendition-tag--hl rendition-tag--personal rendition-tag--alert',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If group alert does not match the authenticated user it is not identified as 'personal'", async () => {
	const element = testHighlightTags({
		text: `!!${otherGroup}`,
		expectedClassName: 'rendition-tag--hl rendition-tag--alert',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test('Tags in messages are highlighted', async () => {
	const element = testHighlightTags({
		text: '#tag',
		expectedClassName: 'rendition-tag--hl',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("If the message is read by the authenticated user it is identified as 'read'", async () => {
	const element = testHighlightTags({
		text: `@${username}`,
		readBy: [user.slug],
		expectedClassName:
			'rendition-tag--hl rendition-tag--personal rendition-tag--read',
	});
	expect(element.setAttribute.callCount).toBe(0);
});

test("The readBy count is stored in the 'data-read-by-count' attribute", async () => {
	const element = testHighlightTags({
		text: `@${myGroup}`,
		readBy: [user.slug],
		expectedClassName:
			'rendition-tag--hl rendition-tag--personal rendition-tag--read-by',
	});
	expect(element.setAttribute.callCount).toBe(1);
	expect(element.setAttribute.getCall(0).args).toEqual([
		'data-read-by-count',
		'1',
	]);
});
