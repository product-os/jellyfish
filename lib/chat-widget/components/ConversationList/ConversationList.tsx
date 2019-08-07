import * as React from 'react';
import { useLoading } from '../../hooks/useLoading';
import { Item, ItemList } from '../../state/reducer';
import { List, ListProps } from '../List/List';
import { ConversationListItem } from './ConversationListItem';

interface ConversationListProps extends Omit<ListProps<Item>, 'renderItem'> {
	onItemClick: (item: Item) => void;
	itemList: ItemList;
}

export const ConversationList: React.FunctionComponent<
	ConversationListProps
> = ({ onItemClick, ...rest }) => {
	const { loading } = useLoading();

	const renderItem = React.useCallback(
		(item: Item) => (
			<ConversationListItem key={item.id} item={item} onClick={onItemClick} />
		),
		[onItemClick],
	);

	return (
		<List
			{...rest}
			renderItem={renderItem}
			loading={loading['conversations:load']}
		/>
	);
};
