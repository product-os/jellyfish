import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import * as sinon from 'sinon';
import { NewMessage } from '../SupportChat/SupportChat';
import { MessageToolbarInput } from './MessageToolbarInput';

ava('Should render message input toolbar', t => {
	const handleChange = sinon.spy();

	const message: NewMessage = {
		id: '',
		subject: '',
		text: 'foo bar',
		attachments: [],
	};

	const wrapper = mount(
		<Provider>
			<MessageToolbarInput value={message} onChange={handleChange} />
		</Provider>,
	);

	t.true(
		wrapper.exists('[data-test-id="send-message-button"]'),
		'should render send message icon by default',
	);

	wrapper.setProps({
		children: (
			<MessageToolbarInput
				value={message}
				onChange={handleChange}
				showSendMessageButton={false}
			/>
		),
	});

	t.false(
		wrapper.exists('[data-test-id="send-message-button"]'),
		'should not render send message button',
	);
});
