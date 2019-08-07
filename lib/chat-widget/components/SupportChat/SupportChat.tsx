import * as React from 'react';
import { Flex, FlexProps } from 'rendition';
import styled from 'styled-components';
import {
	FETCH_CONVERSATIONS_INITIAL_LIMIT,
	useAddNewItem,
	useDownloadFile,
	useLoadConversations,
	useLoadMessages,
	useSendMessage,
} from '../../hooks/actions';
import { useCurrentItem } from '../../hooks/useCurrentItem';
import { useLoading } from '../../hooks/useLoading';
import { useStore } from '../../hooks/useStore';
import { Item, SavedOrDraftMessage } from '../../state/reducer';
import { Attachment } from '../../utils/sdk/sdk';
import { ConversationView } from '../ConversationView/ConversationView';
import { FullConversationList } from '../FullConversationList/FullConversationList';
import { Header } from '../Header/Header';
import { NewConversation } from '../NewConversation/NewConversation';
import { ShortConversationList } from '../ShortConversationList/ShortConversationList';
import { Spinner } from '../Spinner/Spinner';

const Container = styled(Flex)`
	color: ${props => props.theme.colors.tertiary.main};
`;

export interface NewMessage {
	id: string;
	subject: string;
	text: string;
	attachments: File[];
}

export type FileOrAttachment = File | Attachment;

export const SupportChat = (props: FlexProps) => {
	const { state } = useStore();
	const { currentItem, setCurrentItem } = useCurrentItem();
	const { loading } = useLoading();
	const sendMessage = useSendMessage();
	const addNewItem = useAddNewItem();
	const loadConversations = useLoadConversations();
	const loadMessages = useLoadMessages();
	const downloadFile = useDownloadFile();

	React.useEffect(() => {
		if (!state.itemList) {
			loadConversations();
		}
	}, []);

	const handleConversationSelect = React.useCallback(
		(item: Item) => {
			setCurrentItem(item);

			if (!item.messageList) {
				loadMessages(item);
			}
		},
		[setCurrentItem, loadMessages],
	);

	const handleConversationClose = React.useCallback(
		() => setCurrentItem(null),
		[setCurrentItem],
	);

	const handleNewConversation = React.useCallback(() => addNewItem(), [
		addNewItem,
	]);

	const handleLoadMoreConversations = React.useCallback(
		() => loadConversations(),
		[loadConversations],
	);

	const handleLoadMoreMessages = React.useCallback(() => loadMessages(), [
		loadMessages,
	]);

	const handleAttachmentDownload = React.useCallback(
		(attachment: Attachment, message: SavedOrDraftMessage) =>
			downloadFile(attachment, message.id),
		[downloadFile],
	);

	const handleMessageSend = React.useCallback(
		(message: NewMessage) => sendMessage(message),
		[sendMessage],
	);

	const content = React.useMemo(() => {
		if (
			!state.itemList ||
			(state.itemList.records.length <= FETCH_CONVERSATIONS_INITIAL_LIMIT &&
				loading['conversations:load'])
		) {
			return <Spinner flex="1" {...loading['conversations:load']} />;
		}

		if (currentItem && !currentItem.messageList && loading['messages:load']) {
			return <Spinner flex="1" {...loading['messages:load']} />;
		}

		if (currentItem) {
			if (currentItem.messageList) {
				return (
					<ConversationView
						item={currentItem}
						onLoadMoreMessages={handleLoadMoreMessages}
						onAttachmentDownload={handleAttachmentDownload}
						onMessageSend={handleMessageSend}
					/>
				);
			}

			if (!currentItem.conversation) {
				return <NewConversation flex="1" onMessageSend={handleMessageSend} />;
			}
		}

		if (state.itemList.records.length <= FETCH_CONVERSATIONS_INITIAL_LIMIT) {
			return (
				<ShortConversationList
					flex="1"
					itemList={state.itemList}
					onItemClick={handleConversationSelect}
					onNewConversation={handleNewConversation}
					onSeeAllConversations={handleLoadMoreConversations}
				/>
			);
		}

		return (
			<FullConversationList
				flex="1"
				itemList={state.itemList}
				onItemClick={handleConversationSelect}
				onNewConversation={handleNewConversation}
				onLoadMore={handleLoadMoreConversations}
			/>
		);
	}, [currentItem, state.itemList, loading]);

	return (
		<Container {...props} flexDirection="column">
			<Header
				isSupportAgentOnline={false}
				onBackNavigation={currentItem ? handleConversationClose : undefined}
			/>
			<Flex flex="1" flexDirection="column" bg="#f2f3fb">
				{content}
			</Flex>
		</Container>
	);
};
