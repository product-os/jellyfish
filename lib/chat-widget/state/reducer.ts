import * as uuid from 'uuid';
//import { Conversation, Message, Paginated } from '../utils/sdk/sdk';
import { ActionType } from './ActionType';

export interface DraftMessage {
	id: string;
	created_at: null;
	subject: string;
	body: string;
	attachments: File[];
	is_inbound: boolean;
	metadata: {
		headers: {
			externalId: string;
		};
	};
}

export type SavedOrDraftMessage = Message | DraftMessage;
export type MessageList = Paginated<SavedOrDraftMessage>;
export type ItemList = Paginated<Item>;

export interface Item {
	id: string;
	conversation: Conversation | null;
	messageList: MessageList | null;
}

export interface LoadingStateConfig {
	text: string;
	failed?: boolean;
	retry?: (...args: any[]) => any;
}

export type LoadingState = {
	[key: string]: LoadingStateConfig | undefined;
};

export interface State {
	loading: LoadingState;
	currentItemRef: string;
	itemList: ItemList | null;
}

export interface EventData {
	message: Message;
	conversation: Conversation;
}

export type Action =
	| {
			type: ActionType.ADD_ITEMS;
			payload: ItemList;
	  }
	| {
			type: ActionType.SET_LOADING;
			payload: LoadingState;
	  }
	| {
			type: ActionType.SET_CURRENT_ITEM;
			payload: Item | null;
	  }
	| {
			type: ActionType.MESSAGE_SENT | ActionType.MESSAGE_RECEIVED;
			payload: EventData;
	  };

export const initialState: State = {
	loading: {},
	currentItemRef: '',
	itemList: null,
};

export const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case ActionType.SET_LOADING:
			const loading = { ...state.loading };

			Object.keys(action.payload).forEach(key => {
				if (action.payload[key]) {
					loading[key] = action.payload[key];
				} else {
					delete loading[key];
				}
			});

			return {
				...state,
				loading,
			};
		case ActionType.ADD_ITEMS:
			return {
				...state,
				itemList: state.itemList
					? {
							nextPageToken: action.payload.nextPageToken,
							records: state.itemList.records.concat(action.payload.records),
					  }
					: action.payload,
			};
		case ActionType.SET_CURRENT_ITEM:
			if (!state.itemList) {
				return state;
			}

			const records = [...state.itemList.records];
			let itemRef: string = '';

			if (action.payload) {
				let replaced = false;

				for (let i = 0; i < records.length; i++) {
					if (records[i].id === action.payload.id) {
						records[i] = action.payload;
						replaced = true;
						break;
					}
				}

				if (!replaced) {
					records.push(action.payload);
				}

				itemRef = action.payload.id;
			} else if (state.currentItemRef) {
				for (let i = 0; i < records.length; i++) {
					if (
						records[i].id === state.currentItemRef &&
						!records[i].conversation
					) {
						records.splice(i, 1);
						break;
					}
				}
			}

			return {
				...state,
				currentItemRef: itemRef,
				itemList: {
					...state.itemList,
					records,
				},
			};
		case ActionType.MESSAGE_SENT:
		case ActionType.MESSAGE_RECEIVED:
			if (!state.itemList) {
				return state;
			}

			const newItems: Item[] = [];
			let inserted = false;

			state.itemList.records.forEach(item => {
				const newItem: Item = {
					...item,
					messageList: null,
				};

				if (inserted) {
					newItem.messageList = item.messageList;
				} else {
					if (item.messageList) {
						newItem.messageList = {
							nextPageToken: item.messageList.nextPageToken,
							records: [],
						};

						item.messageList.records.forEach(message => {
							if (
								message.is_inbound &&
								action.payload.message.is_inbound &&
								message.metadata.headers.externalId ===
									action.payload.message.metadata.headers.externalId
							) {
								newItem.messageList!.records.push(action.payload.message);
								newItem.conversation = action.payload.conversation;
								inserted = true;
							} else {
								newItem.messageList!.records.push(message);
							}
						});
					}

					if (
						!inserted &&
						item.conversation &&
						item.conversation.id === action.payload.conversation.id
					) {
						newItem.conversation = action.payload.conversation;

						if (newItem.messageList) {
							newItem.messageList!.records.unshift(action.payload.message);
						}

						inserted = true;
					}
				}

				newItems.push(newItem);
			});

			if (!inserted) {
				newItems.unshift({
					id: uuid.v4(),
					conversation: action.payload.conversation,
					messageList: null,
				});
			}

			return {
				...state,
				itemList: {
					...state.itemList,
					records: newItems,
				},
			};
	}
};
