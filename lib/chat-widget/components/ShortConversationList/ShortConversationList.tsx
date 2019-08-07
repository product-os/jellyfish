import * as React from 'react';
import { Box, Flex, FlexProps } from 'rendition';
import { Item, ItemList } from '../../state/reducer';
import { ConversationList } from '../ConversationList/ConversationList';
import { Heading } from '../Heading/Heading';
import { SeeAllConversationsButton } from '../SeeAllConversationsButton/SeeAllConversationsButton';
import { StartConversationButton } from '../StartConversationButton/StartConversationButton';

interface ShortConversationListProps extends FlexProps {
	itemList: ItemList;
	onNewConversation: () => void;
	onSeeAllConversations: () => void;
	onItemClick: (item: Item) => void;
}

export const ShortConversationList = ({
	itemList,
	onNewConversation,
	onSeeAllConversations,
	onItemClick,
	...rest
}: ShortConversationListProps) => (
	<Flex {...rest} flexDirection="column">
		<Box p="0 20px">
			<Heading
				primaryText="Welcome"
				secondaryText="Our team will reply to your questions & solve your problems in realtime as soon as possible."
			/>
		</Box>
		<Box m="0 65px" alignSelf="stretch">
			<StartConversationButton onClick={onNewConversation}>
				New conversation
			</StartConversationButton>
		</Box>
		<ConversationList
			flex="1"
			mt="40px"
			itemList={itemList}
			onItemClick={onItemClick}
			showLoadMore={false}
		/>
		{itemList.nextPageToken && (
			<Flex m="0 65px">
				<SeeAllConversationsButton onClick={onSeeAllConversations} />
			</Flex>
		)}
	</Flex>
);
