import _ from 'lodash';
import React from 'react';
import { saveAs } from 'file-saver';
import { addNotification } from '../../../../services/notifications';
import AttachmentButton from './AttachmentButton';
import MessageContainer from '../MessageContainer';
import AuthenticatedImage from '../../../AuthenticatedImage';

const downloadFile = async (sdk: any, cardId: any, file: any) => {
	const { slug, name, mime } = file;

	const data = await sdk.getFile(cardId, slug);
	const blob = new Blob([data], {
		type: mime,
	});

	saveAs(blob, name);
};

const getAttachments = (card: any) => {
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
	if (_.get(card, ['data', 'payload', 'file'])) {
		attachments.push(card.data.payload.file);
	}

	return attachments;
};

export default class Attachments extends React.Component<any> {
	constructor(props: any) {
		super(props);
		this.downloadAttachments = this.downloadAttachments.bind(this);
	}

	downloadAttachments(event: any) {
		const { card, sdk } = this.props;
		const attachments = getAttachments(card);
		const attachmentSlug = event.currentTarget.dataset.attachmentslug;
		const attachment = _.find(attachments, {
			slug: attachmentSlug,
		});

		try {
			downloadFile(sdk, card.id, attachment);
		} catch (error: any) {
			addNotification('danger', error.message || error);
		}
	}

	render() {
		const { card, actor, maxImageSize, squashTop, squashBottom } = this.props;
		const attachments = getAttachments(card);
		const tooManyAttachments = attachments.length >= 3;

		if (attachments.length > 0) {
			return _.map(attachments, (attachment) => {
				const attachmentIsImage =
					attachment.mime && attachment.mime.match(/image\//);
				if (tooManyAttachments || !attachmentIsImage) {
					return (
						<AttachmentButton
							key={attachment.slug || attachment.url}
							attachment={attachment}
							card={card}
							downloadAttachments={this.downloadAttachments}
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
			});
		}
		return null;
	}
}
