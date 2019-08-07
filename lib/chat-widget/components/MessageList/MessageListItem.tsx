import { sanitize } from 'dompurify';
import * as React from 'react';
import { Box, Flex, FlexProps } from 'rendition';
import styled from 'styled-components';
import { useLoading } from '../../hooks/useLoading';
import { SavedOrDraftMessage } from '../../state/reducer';
import { Attachment } from '../../utils/sdk/sdk';
import { AttachmentList } from '../AttachmentList/AttachmentList';
import { Spinner } from '../Spinner/Spinner';
import { TimeSince } from '../TimeSince/TimeSince';

const Container = styled(Flex)`
	max-width: 70%;
`;

const Content = styled(Box)<{ isInbound: boolean; isDraft: boolean }>`
	padding: 16px 20px;
	border-radius: 12px;
	word-break: break-all;
	${props =>
		props.isInbound
			? `
        background-color: ${props.theme.colors.secondary.light};
        color: white;
        opacity: ${props.isDraft ? '.7' : '1'};
        border-top-right-radius: 0;
        > p { margin: 0; }
    `
			: `
        background-color: white;
        color: inherit;
        border-top-left-radius: 0;
    `};
`;

export interface MessageListItemProps extends FlexProps {
	message: SavedOrDraftMessage;
	onAttachmentDownload: (
		attachment: File | Attachment,
		message: SavedOrDraftMessage,
	) => void;
}

export const MessageListItem = ({
	message,
	onAttachmentDownload,
	...rest
}: MessageListItemProps) => {
	const loading = useLoading().loading[
		`messages:send:${message.metadata.headers.externalId}`
	];

	const body = React.useMemo(
		() => (message.body ? sanitize(message.body) : ''),
		[message.body],
	);

	const handleAttachmentDownload = React.useCallback(
		attachment => onAttachmentDownload(attachment, message),
		[message],
	);

	return (
		<Container
			{...rest}
			flexDirection="column"
			mb="10px"
			alignItems={message.is_inbound ? 'flex-end' : 'flex-start'}
		>
			{message.created_at && (
				<TimeSince mb="3px" align="end" date={message.created_at * 1000} />
			)}

			{body && (
				<Content
					mb={1}
					dangerouslySetInnerHTML={{ __html: body }}
					isInbound={message.is_inbound}
					isDraft={!message.created_at}
				/>
			)}

			<AttachmentList
				justifyContent={message.is_inbound ? 'flex-end' : 'flex-start'}
				value={message.attachments}
				onDownload={handleAttachmentDownload}
			/>

			{loading && <Spinner {...loading} />}
		</Container>
	);
};
