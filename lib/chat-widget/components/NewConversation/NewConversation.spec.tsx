import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { NewMessage } from '../SupportChat/SupportChat';
import { NewConversation } from './NewConversation';

ava('Should render NewConversation', t => {
	const handleMessageSend = sinon.spy<(message: NewMessage) => void>(
		_message => undefined,
	);

	const wrapper = shallow(
		<NewConversation onMessageSend={handleMessageSend} />,
	);

	const instance = wrapper.instance() as NewConversation;

	const message = {
		id: '',
		text: 'test message text',
		subject: 'test message subject',
		attachments: [],
	};

	instance.handleMessageChange(message);
	instance.handleStartConversationButtonClick();

	t.true(handleMessageSend.calledOnce);
	t.deepEqual(handleMessageSend.args[0][0], message);
});
