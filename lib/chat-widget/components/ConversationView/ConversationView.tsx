import * as React from 'react';
import { Box, Flex } from 'rendition';
import * as uuid from 'uuid';
import { Item, SavedOrDraftMessage } from '../../state/reducer';
import { Attachment } from '../../utils/sdk/sdk';
import { AttachmentList } from '../AttachmentList/AttachmentList';
import { MessageList } from '../MessageList/MessageList';
import { MessageTextInput } from '../MessageTextInput/MessageTextInput';
import { MessageToolbarInput } from '../MessageToolbarInput/MessageToolbarInput';
import { NewMessage } from '../SupportChat/SupportChat';

interface ConversationViewProps {
	item: Item;
	onMessageSend: (message: NewMessage) => void;
	onLoadMoreMessages: () => void;
	onAttachmentDownload: (
		attachment: Attachment,
		message: SavedOrDraftMessage,
	) => void;
}

interface ConversationViewState {
	message: NewMessage;
}

export class ConversationView extends React.Component<
	ConversationViewProps,
	ConversationViewState
> {
	state = {
		message: {
			id: uuid.v4(),
			subject: '',
			text: '',
			attachments: [],
		} as NewMessage,
	};

	handleMessageSend = () => {
		const { message } = this.state;
		const { item, onMessageSend } = this.props;

		if (item.conversation && (message.text || message.attachments.length)) {
			onMessageSend(message);

			this.setState({
				message: {
					id: uuid.v4(),
					subject: '',
					text: '',
					attachments: [],
				},
			});
		}
	};

	handleAttachmentsChange = (attachments: File[]) => {
		this.setState(({ message }) => ({
			message: {
				...message,
				attachments,
			},
		}));
	};

	handleMessageChange = (message: NewMessage) => {
		this.setState({
			message,
		});
	};

	handleTextInputKeypress = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.which === 13 && !e.shiftKey) {
			e.preventDefault();
			this.handleMessageSend();
		}
	};

	render() {
		const { item, onAttachmentDownload, onLoadMoreMessages } = this.props;
		const { message } = this.state;

		return (
			<Flex flexDirection="column" flex="1">
				<MessageList
					flex="1"
					itemList={item.messageList!}
					onAttachmentDownload={onAttachmentDownload}
					onLoadMore={onLoadMoreMessages}
				/>
				<Box bg="white" p="5px 5px 0">
					<AttachmentList
						value={message.attachments}
						canDelete
						onChange={this.handleAttachmentsChange}
					/>
					<MessageTextInput
						value={message}
						onChange={this.handleMessageChange}
						onKeyPress={this.handleTextInputKeypress}
					/>
					<MessageToolbarInput
						canSendMessage={!!item.conversation}
						showSendMessageButton
						value={message}
						onChange={this.handleMessageChange}
						onMessageSend={this.handleMessageSend}
					/>
				</Box>
			</Flex>
		);
	}
}
