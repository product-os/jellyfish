import _ from 'lodash';
import React from 'react';
import { saveAs } from 'file-saver';
import { addNotification } from '../../../../services/notifications';
import AttachmentButton from './AttachmentButton';
import MessageContainer from '../MessageContainer';
import AuthenticatedImage from '../../../AuthenticatedImage';
import { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { Contract } from 'autumndb';

const downloadFile = async (
	sdk: JellyfishSDK,
	cardId: string,
	file: { slug: string; name: string; mime: string },
) => {
	const { slug, name, mime } = file;

	const data = await sdk.getFile(cardId, slug);
	const blob = new Blob([data], {
		type: mime,
	});

	saveAs(blob, name);
};

const getAttachments = (card: Contract) => {
	// Start by mapping sync attachments
	const attachments = _.get(card, ['data', 'payload', 'attachments'], []).map(
		(attachment: any) => {
			return {
				slug: attachment.url.split('/').pop(),
				mime: attachment.mime,
				name: attachment.name,
			};
		},
	);

	// Attach files directly uploaded in Jellyfish
	if ((card as any).data?.payload?.file) {
		attachments.push((card as any).data.payload.file);
	}

	return attachments;
};

interface Props {
	card: Contract;
	sdk: JellyfishSDK;
	actor: {
		card: Contract;
		proxy?: boolean;
	};
	squashTop?: boolean;
	squashBottom?: boolean;
	maxImageSize: number;
}

export default (props: Props) => {
	const { card, sdk, actor, maxImageSize, squashTop, squashBottom } = props;

	const downloadAttachments = React.useCallback(
		async (event: any) => {
			const items = getAttachments(card);
			const attachmentSlug = event.currentTarget.dataset.attachmentslug;
			const attachment = _.find(items, {
				slug: attachmentSlug,
			});

			try {
				await downloadFile(sdk, card.id, attachment);
			} catch (error: any) {
				addNotification('danger', error.message || error);
			}
		},
		[card, sdk],
	);

	const attachments = getAttachments(card);
	const tooManyAttachments = attachments.length >= 3;

	if (attachments.length > 0) {
		return (
			<>
				{_.map(attachments, (attachment) => {
					const attachmentIsImage =
						attachment.mime && attachment.mime.match(/image\//);
					if (tooManyAttachments || !attachmentIsImage) {
						return (
							<AttachmentButton
								key={attachment.slug || attachment.url}
								attachment={attachment}
								card={card}
								downloadAttachments={downloadAttachments}
							/>
						);
					}
					return (
						<MessageContainer
							key={attachment.slug || attachment.url}
							card={card}
							actor={actor}
							squashTop={squashTop}
							squashBottom={squashBottom}
							pt={2}
							px={3}
							mr={1}
						>
							<AuthenticatedImage
								data-test="event-card__image"
								cardId={card.id}
								fileName={attachment.slug}
								mimeType={attachment.mime}
								maxImageSize={maxImageSize}
							/>
						</MessageContainer>
					);
				})}
			</>
		);
	}
	return null;
};
