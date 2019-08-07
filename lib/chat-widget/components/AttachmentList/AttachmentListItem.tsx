import * as React from 'react';
import ArrowDownIcon = require('react-icons/lib/md/arrow-downward');
import TimesIcon = require('react-icons/lib/md/close');
import { Button, Flex, FlexProps, Txt } from 'rendition';
import styled from 'styled-components';
import { truncateFileName } from '../../utils/file';
import { Attachment } from '../../utils/sdk/sdk';

interface AttachmentListItemProps extends FlexProps {
	attachment: File | Attachment;
	canDelete?: boolean;
	onDelete: () => void;
	onDownload: () => void;
}

const Container = styled(Flex)`
	border-radius: 20px;
	border: solid 1px ${props => props.theme.colors.primary.main};
	color: ${props => props.theme.colors.primary.main};
	padding: 0 15px;
	line-height: 1.42;
`;

const ActionButton = styled(Button)`
	margin-left: 10px;
	color: inherit;
`;

export const AttachmentListItem = ({
	attachment,
	canDelete,
	onDelete,
	onDownload,
	...rest
}: AttachmentListItemProps) => (
	<Container {...rest}>
		<Txt color="#2197de">
			{truncateFileName(
				attachment instanceof File ? attachment.name : attachment.filename,
			)}
		</Txt>

		{!(attachment instanceof File) && (
			<ActionButton
				data-test-id="download-button"
				onClick={onDownload}
				plain
				icon={<ArrowDownIcon />}
			/>
		)}

		{canDelete && (
			<ActionButton
				data-test-id="delete-button"
				onClick={onDelete}
				plain
				icon={<TimesIcon />}
			/>
		)}
	</Container>
);
