import { useCallback } from 'react';
import { downloadFile } from '../../utils/file';
import { Attachment } from '../../utils/sdk/sdk';
import { useSdk } from '../useSdk';

export const useDownloadFile = () => {
	const sdk = useSdk();

	return useCallback(
		async (attachment: Attachment, messageId: string) => {
			const blob = await sdk.models.attachment.download({
				attachmentId: attachment.id,
				messageId,
			});

			downloadFile(blob, attachment.filename);
		},
		[sdk],
	);
};
