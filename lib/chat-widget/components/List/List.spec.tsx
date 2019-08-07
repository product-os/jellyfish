import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { Txt } from 'rendition';
import { Paginated } from '../../utils/sdk/sdk';
import { List } from './List';

ava('Should render list', t => {
	type Item = {
		id: string;
	};

	const itemList: Paginated<Item> = {
		nextPageToken: '',
		records: [
			{
				id: '1',
			},
			{
				id: '2',
			},
		],
	};

	const CustomItem: React.FunctionComponent = ({ children }) => (
		<Txt>{children}</Txt>
	);

	const renderItem = (item: Item) => <CustomItem>{item.id}</CustomItem>;

	const wrapper = shallow(<List itemList={itemList} renderItem={renderItem} />);

	t.is(wrapper.find(CustomItem).length, itemList.records.length);
});
