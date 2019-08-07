import * as React from 'react';
import { Box, Flex, FlexProps } from 'rendition';
import { ItemList } from '../../state/reducer';
import { ConversationList } from '../ConversationList/ConversationList';
import { StartConversationButton } from '../StartConversationButton/StartConversationButton';

interface FullConversationListProps extends FlexProps {
	itemList: ItemList;
	onItemClick: (item: any) => void;
	onNewConversation: () => void;
	onLoadMore?: () => void;
}

export const FullConversationList = ({
	itemList,
	onItemClick,
	onNewConversation,
	onLoadMore,
	...rest
}: FullConversationListProps) => (
	<Flex {...rest} flexDirection="column">
		<ConversationList
			flex="1"
			itemList={itemList}
			onItemClick={onItemClick}
			onLoadMore={onLoadMore}
		/>
		<Box p="20px 65px" width="100%">
			<StartConversationButton width="100%" onClick={onNewConversation}>
				New conversation
			</StartConversationButton>
		</Box>
	</Flex>
);
