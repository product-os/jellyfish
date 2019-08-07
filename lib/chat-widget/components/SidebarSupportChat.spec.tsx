import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import {
	SidebarSupportChat,
	SidebarSupportChatContainer,
	SidebarSupportChatProps,
} from './SidebarSupportChat';

ava("Should toggle sidebar's visibility", t => {
	const wrapper = shallow<SidebarSupportChatProps>(
		<SidebarSupportChat apiHost="" token="" />,
	);

	t.false(
		wrapper.exists(SidebarSupportChatContainer),
		'container should be hidden by default',
	);

	wrapper.simulate('keypress', {
		key: 'g',
		ctrlKey: true,
	});

	t.true(
		wrapper.exists(SidebarSupportChatContainer),
		'container should become visible after ctrl+g keys pressed',
	);
});
