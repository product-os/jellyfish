import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import { MessageListItem } from '../MessageList/MessageListItem';
import { MessageList } from './MessageList';

const messageList = {
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
};

ava('Should render message list', t => {
	const wrapper = mount(
		<Provider>
			<MessageList
				itemList={messageList}
				onAttachmentDownload={() => undefined}
			/>
		</Provider>,
	);

	t.is(wrapper.find(MessageListItem).length, messageList.records.length);
});
