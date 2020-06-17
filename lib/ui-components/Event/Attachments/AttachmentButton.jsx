/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button,
	Txt
} from 'rendition'
import Icon from '../../shame/Icon'

const AttachmentButton = ({
	attachment,
	index,
	downloadAttachments,
	card
}) => {
	return (
		<Button
			key={`${attachment.url}-${index}`}
			data-attachmentslug={attachment.slug}
			onClick={downloadAttachments}
			secondary={card.type.split('@')[0] === 'whisper'}
			data-test="event-card__file"
			mr={2}
			mb={2}
		>
			<Icon name="file-download" />
			<Txt monospace ml={2}>
				{attachment.name}
			</Txt>
		</Button>
	)
}

export default AttachmentButton
