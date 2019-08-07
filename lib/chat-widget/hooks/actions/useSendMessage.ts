import * as marked from 'marked';
import { useCallback } from 'react';
import * as uuid from 'uuid';
import { NewMessage } from '../../components/SupportChat/SupportChat';
import { DraftMessage } from '../../state/reducer';
import { Message } from '../../utils/sdk/sdk';
import { useCurrentItem } from '../useCurrentItem';
import { useLoading } from '../useLoading';
import { useSdk } from '../useSdk';

export const useSendMessage = () => {
	const { currentItem, setCurrentItem } = useCurrentItem();
	const { setLoading } = useLoading();
	const sdk = useSdk();

	return useCallback(
		async ({ subject, text, attachments }: NewMessage) => {
			if (!currentItem) {
				return;
			}

			const externalId = uuid.v4();

			const draftMessage: DraftMessage = {
				id: uuid.v4(),
				created_at: null,
				subject,
				body: marked(text),
				attachments,
				is_inbound: true,
				metadata: {
					headers: {
						externalId,
					},
				},
			};

			setCurrentItem({
				...currentItem,
				messageList: currentItem.messageList
					? {
							...currentItem.messageList,
							records: ([draftMessage] as Array<Message | DraftMessage>).concat(
								currentItem.messageList.records,
							),
					  }
					: {
							nextPageToken: '',
							records: [draftMessage],
					  },
			});

			const send = async () => {
				setLoading(`messages:send:${externalId}`, {
					text: 'Sending message',
				});

				try {
					await sdk.models.message.send({
						conversationId: currentItem.conversation
							? currentItem.conversation.id
							: '',
						subject,
						text,
						externalId: draftMessage.metadata.headers.externalId,
						attachments,
					});
				} catch (err) {
					return setLoading(`messages:send:${externalId}`, {
						text: (err && err.message) || 'Sending message failed',
						failed: true,
						retry: send,
					});
				}

				setLoading(`messages:send:${externalId}`, undefined);
			};

			send();
		},
		[currentItem, setLoading, sdk],
	);
};
