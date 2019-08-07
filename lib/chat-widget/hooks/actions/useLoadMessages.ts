import { useCallback } from 'react';
import { Item } from '../../state/reducer';
import { Message, Paginated } from '../../utils/sdk/sdk';
import { useCurrentItem } from '../useCurrentItem';
import { useLoading } from '../useLoading';
import { useSdk } from '../useSdk';

const FETCH_MESSAGES_LIMIT = 15;

export const useLoadMessages = () => {
	const sdk = useSdk();
	const { currentItem, setCurrentItem } = useCurrentItem();
	const { setLoading } = useLoading();

	return useCallback(
		async function loadMessages(item: Item | null = currentItem) {
			if (
				!item ||
				!item.conversation ||
				(item.messageList && !item.messageList.nextPageToken)
			) {
				return;
			}

			setLoading('messages:load', {
				text: 'Loading messages',
			});

			let result: Paginated<Message>;

			try {
				result = await sdk.models.conversation.getMessages({
					limit: FETCH_MESSAGES_LIMIT,
					conversationId: item.conversation.id,
					pageToken: item.messageList
						? item.messageList.nextPageToken
						: undefined,
				});
			} catch (err) {
				return setLoading('messages:load', {
					text: (err && err.message) || 'Loading messages failed',
					failed: true,
					retry: () => loadMessages(item),
				});
			}

			setLoading('messages:load', undefined);

			setCurrentItem({
				...item,
				messageList: {
					nextPageToken: result.nextPageToken,
					records: item.messageList
						? item.messageList.records.concat(result.records)
						: result.records,
				},
			});
		},
		[currentItem, setCurrentItem, setLoading, sdk],
	);
};
