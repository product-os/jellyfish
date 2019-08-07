import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import * as sinon from 'sinon';
import { Item, ItemList } from '../../state/reducer';
import { ConversationListItem } from '../ConversationList/ConversationListItem';
import { SeeAllConversationsButton } from '../SeeAllConversationsButton/SeeAllConversationsButton';
import { StartConversationButton } from '../StartConversationButton/StartConversationButton';
import { ShortConversationList } from './ShortConversationList';

ava('Should render short conversation list', t => {
	const itemList: ItemList = {
		nextPageToken: 'test',
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
	const handleSeeAllConversations = sinon.spy();

	const wrapper = mount(
		<Provider>
			<ShortConversationList
				itemList={itemList}
				onItemClick={handleItemClick}
				onNewConversation={handleNewConversation}
				onSeeAllConversations={handleSeeAllConversations}
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

	// Check if handler executes on "See all conversations" button click
	const seeAllConversationsButton = wrapper.find(SeeAllConversationsButton);
	seeAllConversationsButton.simulate('click');
	t.true(handleSeeAllConversations.calledOnce);
});
