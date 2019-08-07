import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { AttachmentList } from '../AttachmentList/AttachmentList';
import { MessageTextInput } from '../MessageTextInput/MessageTextInput';
import { MessageToolbarInput } from '../MessageToolbarInput/MessageToolbarInput';
import { ConversationView } from './ConversationView';

const item = {
	id: '1',
	messageList: {
		nextPageToken: '',
		records: [
			{
				id: '1',
				subject: '',
				body: '',
				blurb: '',
				is_inbound: false,
				created_at: 0,
				attachments: [
					{
						id: '2',
						filename: 'second.txt',
						url: 'https://fake.com/2',
						contentType: 'text/plain',
						size: 202,
						metadata: {},
					},
				],
				metadata: {
					headers: {},
				},
			},
		],
	},
	conversation: {
		id: '1',
		subject: '',
		last_message: {
			id: '',
			subject: '',
			body: '',
			blurb: '',
			is_inbound: false,
			created_at: 0,
			attachments: [],
			metadata: {
				headers: {},
			},
		},
	},
};

ava('Should render conversation view', t => {
	const handleMessageSend = sinon.spy();
	const handleLoadMoreMessages = sinon.spy();
	const handleAttachmentDownload = sinon.spy();

	const wrapper = shallow<ConversationView>(
		<ConversationView
			item={item}
			onMessageSend={handleMessageSend}
			onLoadMoreMessages={handleLoadMoreMessages}
			onAttachmentDownload={handleAttachmentDownload}
		/>,
	);

	const attachmentListWrapper = wrapper.find(AttachmentList);
	const newFile = new File(['foo'], 'bar.txt');
	attachmentListWrapper!.props().onChange!([newFile]);

	t.is(wrapper.state().message.attachments[0], newFile);

	const messageTextInputWrapper = wrapper.find(MessageTextInput);
	const newText = 'changed text';

	messageTextInputWrapper.props().onChange!({
		...wrapper.state().message,
		text: newText,
	});

	t.is(wrapper.state().message.text, newText);

	const messageToolbarInputWrapper = wrapper.find(MessageToolbarInput);
	const stateBeforeSending = wrapper.state();
	messageToolbarInputWrapper!.props().onMessageSend!();

	t.deepEqual(handleMessageSend.args[0][0], stateBeforeSending.message);
	t.is(wrapper.state().message.text, '');
	t.is(wrapper.state().message.subject, '');
});
