import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import * as sinon from 'sinon';
import { Item, ItemList } from '../../state/reducer';
import { ConversationList } from './ConversationList';
import { ConversationListItem } from './ConversationListItem';

ava('Should render conversation list', t => {
	const itemList: ItemList = {
		nextPageToken: '',
		records: [
			{
				id: '1',
				messageList: null,
				conversation: {
					id: '',
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
			},
			{
				id: '2',
				messageList: null,
				conversation: {
					id: '',
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
			},
		],
	};

	const handleItemClick = sinon.spy((_item: Item) => undefined);

	const wrapper = mount(
		<Provider>
			<ConversationList itemList={itemList} onItemClick={handleItemClick} />
		</Provider>,
	);

	const children = wrapper.find(ConversationListItem);
	t.is(children.length, itemList.records.length);

	const second = children.at(1);
	second.simulate('click');

	t.true(handleItemClick.calledOnceWith(itemList.records[1]));
});
