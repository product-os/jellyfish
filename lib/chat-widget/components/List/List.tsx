import * as React from 'react';
import { Button, Flex } from 'rendition';
import { LoadingStateConfig } from '../../state/reducer';
import { Paginated } from '../../utils/sdk/sdk';
import { Spinner } from '../Spinner/Spinner';
import {
	VerticalScrollBox,
	VerticalScrollBoxProps,
} from '../VerticalScrollBox/VerticalScrollBox';

export interface ListProps<TItem> extends VerticalScrollBoxProps {
	itemList: Paginated<TItem>;
	onLoadMore?: () => void;
	showLoadMore?: boolean;
	loading?: LoadingStateConfig;
	renderItem: (item: TItem) => JSX.Element;
}

const ListBase = <TItem extends {}>({
	itemList,
	onLoadMore,
	showLoadMore = true,
	loading,
	renderItem,
	...rest
}: ListProps<TItem>) => (
	<VerticalScrollBox {...rest}>
		{itemList.records.map(item => renderItem(item))}
		{showLoadMore && itemList.nextPageToken && (
			<Flex flexDirection="column" alignItems="center">
				{loading ? (
					<Spinner {...loading} />
				) : (
					<Button underline onClick={onLoadMore} p="5px">
						Load more
					</Button>
				)}
			</Flex>
		)}
	</VerticalScrollBox>
);

export const List = React.memo(ListBase);
