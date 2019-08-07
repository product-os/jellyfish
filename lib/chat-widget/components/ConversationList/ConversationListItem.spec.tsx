import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { Theme } from 'rendition';
import * as sinon from 'sinon';
import { Item } from '../../state/reducer';
import { ConversationListItemBase } from './ConversationListItem';

ava('Render conversation list item', t => {
	const item: Item = {
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
	};

	const handleClick = sinon.spy((_item: Item) => undefined);

	const wrapper = shallow(
		<ConversationListItemBase
			item={item}
			onClick={handleClick}
			theme={Theme}
		/>,
	);

	(wrapper.instance() as ConversationListItemBase).handleClick();
	t.true(handleClick.calledOnceWith(item));
});
