import _ = require('lodash');
import { useCallback } from 'react';
import * as uuid from 'uuid';
import { ActionType } from '../../state/ActionType';
import { useLoading } from '../useLoading';
import { useSdk } from '../useSdk';
import { useStore } from '../useStore';
import { useAddNewItem } from './useAddNewItem';

export const FETCH_CONVERSATIONS_INITIAL_LIMIT = 2;
const FETCH_MORE_CONVERSATIONS_LIMIT = 10;

export const useLoadConversations = () => {
	const { state, dispatch } = useStore();
	const sdk = useSdk();
	const { setLoading } = useLoading();
	const addNewItem = useAddNewItem();

	return useCallback(
		async function loadConversations() {
			const isFirstTime = !state.itemList;

			setLoading('conversations:load', {
				text: 'Loading conversations',
			});

			let conversations: Conversation[];

			try {
				// Make it abstract
				conversations = (await sdk.query(
					{
						$$links: {
							'has attached element': {
								type: 'object',
								additionalProperties: true
							},
						},
						properties: {
							links: {
								type: 'object',
								additionalProperties: true
							},
							type: {
								const: 'support-thread',
							},
						},
						additionalProperties: true,
					},
					isFirstTime
						? {
								limit: FETCH_CONVERSATIONS_INITIAL_LIMIT,
						}
						: {
								limit: FETCH_MORE_CONVERSATIONS_LIMIT,
								//pageToken: state.itemList!.nextPageToken,
						},
				)).map((card: any) => {
					const timeline = _.sortBy(_.get(card.links, ['has attached element'], []), 'data.timestamp');
					let latestText = null

					// Find the most recent message, whisper or named event
					for (let index = timeline.length - 1; index >= 0; index--) {
						const event = timeline[index];

						if (event.type === 'message') {
							latestText = _.get(event, [ 'data', 'payload', 'message' ], '')
								.split('\n')
								.shift();
							break;
						}

						if (event.type === 'update' && Boolean(event.name)) {
							latestText = event.name;
							break;
						}
					}

					return {
						id: card.id,
						created_at: card.created_at,
						subject: card.data.description,
						blurb: latestText,
					} as Conversation;
				});
			} catch (err) {
				return setLoading('conversations:load', {
					text: (err && err.message) || 'Loading conversations failed',
					failed: true,
					retry: loadConversations,
				});
			}

			setLoading('conversations:load', undefined);

			const records = conversations.map((conversation: any) => ({
				id: uuid.v4(),
				conversation,
				messageList: null,
			}));

			dispatch({
				type: ActionType.ADD_ITEMS,
				payload: {
					nextPageToken: '',//result.nextPageToken,
					records,
				},
			});

			if (isFirstTime && !records.length) {
				addNewItem();
			}
		},
		[state.itemList, dispatch, setLoading, addNewItem],
	);
};
