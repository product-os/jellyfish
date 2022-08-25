import update from 'immutability-helper';
import merge from 'lodash/merge';
import type { Contract } from 'autumndb';
import { Action } from './action-types';

export interface State {
	product: string;
	productTitle: string;
	inbox: string;
	currentUser?: null | string;
	cards?: {
		[id: string]: Contract;
	};
	groups?: Contract[];
}

const mergeCards = (state: State, cards: Contract[]) => {
	return Object.assign(
		{},
		cards.reduce((newCards, card) => {
			newCards[card.id] = merge({}, newCards[card.id], card);
			return newCards;
		}, state.cards || {}),
	);
};

const extractLinksFromCards = (threads: Contract[]) => {
	return threads.reduce((cards, thread) => {
		if (thread.links && thread.links['has attached element']) {
			return cards.concat(thread, thread.links['has attached element']);
		}
		return cards.concat(thread);
	}, [] as Contract[]);
};

export const createReducer = ({
	product,
	productTitle,
	inbox,
}: {
	product: string;
	productTitle: string;
	inbox: string;
}) => {
	const initialState: State = {
		product,
		productTitle,
		inbox,
		cards: {} as { [key: string]: Contract },
		currentUser: null,
	};

	return (state = initialState, action: Action) => {
		if (!action) {
			return state;
		}
		switch (action.type) {
			case 'SET_CARDS': {
				const threads = extractLinksFromCards(action.payload);
				return update(state, {
					cards: {
						$set: mergeCards(state, threads),
					},
				});
			}
			case 'DELETE_CARD': {
				if (state.cards) {
					const { [action.payload]: target, ...cards } = state.cards;

					return {
						...state,
						cards,
					};
				}

				return state;
			}
			case 'SET_CURRENT_USER':
				return update(state, {
					currentUser: {
						$set: action.payload.id,
					},
					cards: {
						$set: mergeCards(state, [action.payload]),
					},
				});
			case 'SET_GROUPS':
				return update<any>(state, {
					groups: {
						$set: action.payload,
					},
				});

			default:
				return state;
		}
	};
};
