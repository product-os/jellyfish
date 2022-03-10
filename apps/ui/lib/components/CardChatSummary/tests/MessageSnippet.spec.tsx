import { getWrapper } from '../../../../test/ui-setup';
import _ from 'lodash';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import msg from './fixtures/msg-text.json';
import userWithOrg from './fixtures/user-2.json';
import { MessageSnippet } from '../MessageSnippet';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper(
	{},
	{
		getCard: sandbox.stub().resolves(userWithOrg),
		selectCard: sandbox.stub().returns(sandbox.stub().returns(userWithOrg)),
	},
).wrapper;

afterEach(() => {
	sandbox.restore();
});

test('MessageSnippet displays the user avatar and the message text', async () => {
	const component = await mount(<MessageSnippet messageCard={msg} />, {
		wrappingComponent,
	});

	// The UserStatusIcon is part of the user avatar component
	const userStatusIcon: any = component.find('UserStatusIcon');
	expect(userStatusIcon.props().userStatus.value).toBe('DoNotDisturb');

	const txt = component.find('p').first();
	expect(txt.text()).toBe(msg.data.payload.message);
});

test('MessageSnippet does not display hidden front URLs', async () => {
	const selectCard = sandbox.stub().returns(() => {
		return userWithOrg;
	});
	const getCard = sandbox.stub();

	const frontCard = _.merge({}, msg, {
		data: {
			payload: {
				message:
					'Line1[](https://www.balena-cloud.com?hidden=whisper&source=flowdock)',
			},
		},
	});

	const component = await mount(
		<MessageSnippet
			messageCard={frontCard}
			// @ts-ignore
			selectCard={selectCard}
			getCard={getCard}
		/>,
		{
			wrappingComponent,
		},
	);

	const txt = component.find('p').first();
	expect(txt.text()).toBe('Line1');
});
