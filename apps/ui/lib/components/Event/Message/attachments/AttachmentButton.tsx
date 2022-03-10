import React from 'react';
import { Button, Txt } from 'rendition';
import Icon from '../../../shame/Icon';

const AttachmentButton = ({ attachment, downloadAttachments, card }: any) => {
	return (
		<Button
			data-attachmentslug={attachment.slug}
			onClick={downloadAttachments}
			secondary={card.type.split('@')[0] === 'whisper'}
			data-test="event-card__file"
			mr={2}
			my={1}
		>
			<Icon name="file-download" />
			<Txt monospace ml={2}>
				{attachment.name}
			</Txt>
		</Button>
	);
};

export default AttachmentButton;
