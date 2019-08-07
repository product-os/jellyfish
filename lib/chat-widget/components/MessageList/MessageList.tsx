import * as React from 'react';
import { useLoading } from '../../hooks/useLoading';
import { SavedOrDraftMessage } from '../../state/reducer';
import { List, ListProps } from '../List/List';
import { FileOrAttachment } from '../SupportChat/SupportChat';
import { MessageListItem } from './MessageListItem';

type MessageListProps = Omit<ListProps<SavedOrDraftMessage>, 'renderItem'> & {
	onAttachmentDownload: (
		attachment: FileOrAttachment,
		message: SavedOrDraftMessage,
	) => void;
};

export const MessageList: React.FunctionComponent<MessageListProps> = ({
	onAttachmentDownload,
	...rest
}) => {
	const { loading } = useLoading();

	const renderItem = React.useCallback(
		(message: SavedOrDraftMessage) => (
			<MessageListItem
				key={message.id}
				alignSelf={message.is_inbound ? 'flex-end' : 'flex-start'}
				message={message}
				onAttachmentDownload={onAttachmentDownload}
			/>
		),
		[onAttachmentDownload],
	);

	return (
		<List
			{...rest}
			m="5px"
			revert
			renderItem={renderItem}
			loading={loading['messages:load']}
		/>
	);
};
