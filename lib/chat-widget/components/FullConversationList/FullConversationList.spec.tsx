import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import * as sinon from 'sinon';
import { Item, ItemList } from '../../state/reducer';
import { ConversationListItem } from '../ConversationList/ConversationListItem';
import { StartConversationButton } from '../StartConversationButton/StartConversationButton';
import { FullConversationList } from './FullConversationList';

ava('Should render full conversation list', t => {
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

	const handleItemClick = sinon.spy<(item: Item) => void>(
		(_item: Item) => undefined,
	);
	const handleNewConversation = sinon.spy();

	const wrapper = mount(
		<Provider>
			<FullConversationList
				itemList={itemList}
				onItemClick={handleItemClick}
				onNewConversation={handleNewConversation}
			/>
		</Provider>,
	);

	// Check if correct amount of items are rendered
	const children = wrapper.find(ConversationListItem);
	t.is(children.length, itemList.records.length, 'should render items');

	// Check if right data is sent in item onclick handler
	const second = children.at(1);
	second.simulate('click');
	t.true(handleItemClick.calledOnceWith(itemList.records[1]));

	// Check if handler executes on "New conversation" button click
	const newConversationButton = wrapper.find(StartConversationButton);
	newConversationButton.simulate('click');
	t.true(handleNewConversation.calledOnce);
});
