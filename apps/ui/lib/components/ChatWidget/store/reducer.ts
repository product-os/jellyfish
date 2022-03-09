import update from 'immutability-helper';
import merge from 'lodash/merge';
import type { Contract } from '@balena/jellyfish-types/build/core';
import {
	SET_CARDS,
	SET_CURRENT_USER,
	SET_GROUPS,
	DELETE_CARD,
} from './action-types';

const mergeCards = (state, cards) => {
	return Object.assign(
		{},
		cards.reduce((newCards, card) => {
			newCards[card.id] = merge({}, newCards[card.id], card);
			return newCards;
		}, state.cards),
	);
};

const extractLinksFromCards = (threads) => {
	return threads.reduce((cards, thread) => {
		if (thread.links && thread.links['has attached element']) {
			return cards.concat(thread, thread.links['has attached element']);
		}
		return cards.concat(thread);
	}, []);
};

export const createReducer = ({ product, productTitle, inbox }) => {
	const initialState = {
		product,
		productTitle,
		inbox,
		cards: {} as { [key: string]: Contract[] },
		currentUser: null,
	};

	return (state = initialState, action: any = {}) => {
		switch (action.type) {
			case SET_CARDS: {
				const threads = extractLinksFromCards(action.payload);
				return update(state, {
					cards: {
						$set: mergeCards(state, threads),
					},
				});
			}
			case DELETE_CARD: {
				const { [action.payload]: target, ...cards } = state.cards;

				return {
					...state,
					cards,
				};
			}
			case SET_CURRENT_USER:
				return update(state, {
					currentUser: {
						$set: action.payload.id,
					},
					cards: {
						$set: mergeCards(state, [action.payload]),
					},
				});
			case SET_GROUPS:
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
