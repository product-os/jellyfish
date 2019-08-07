import * as React from 'react';
import { Flex, FlexProps } from 'rendition';
import { FileOrAttachment } from '../SupportChat/SupportChat';
import { AttachmentListItem } from './AttachmentListItem';

export type AttachmentListProps = {
	value: FileOrAttachment[];
	onChange?: (value: FileOrAttachment[]) => void;
	onDownload?: (attachment: FileOrAttachment) => void;
	canDelete?: boolean;
} & Omit<FlexProps, 'onChange'>;

export class AttachmentList extends React.Component<AttachmentListProps> {
	handleItemDelete = (attachment: FileOrAttachment) => {
		const { value, onChange } = this.props;

		if (onChange) {
			onChange(value.filter(item => item !== attachment));
		}
	};

	render() {
		const { value, onChange, onDownload, canDelete, ...rest } = this.props;

		return (
			<Flex {...rest} flexWrap="wrap">
				{value.map(attachment => (
					<AttachmentListItem
						key={'id' in attachment ? attachment.id : attachment.lastModified}
						ml={1}
						mb={1}
						attachment={attachment}
						canDelete={canDelete}
						onDelete={() => this.handleItemDelete(attachment)}
						onDownload={() => onDownload && onDownload(attachment)}
					/>
				))}
			</Flex>
		);
	}
}
