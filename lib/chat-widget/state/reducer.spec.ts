import ava from 'ava';
import { ActionType } from './ActionType';
import { initialState, reducer } from './reducer';

ava('Should set and unset loading', t => {
	let state = reducer(initialState, {
		type: ActionType.SET_LOADING,
		payload: {
			'conversations:load': {
				text: 'Conversations loading',
			},
		},
	});

	t.is(state.loading['conversations:load']!.text, 'Conversations loading');

	state = reducer(state, {
		type: ActionType.SET_LOADING,
		payload: {
			'conversations:load': undefined,
		},
	});

	t.false('conversations:load' in state.loading);
});

ava('Should add items', t => {
	const state = reducer(initialState, {
		type: ActionType.ADD_ITEMS,
		payload: {
			nextPageToken: '',
			records: [
				{
					id: '1',
					conversation: null,
					messageList: null,
				},
			],
		},
	});

	t.is(state.itemList!.records[0].id, '1');
});

ava('Should add item and set it as current', t => {
	const state = reducer(
		{
			...initialState,
			itemList: {
				nextPageToken: '',
				records: [],
			},
		},
		{
			type: ActionType.SET_CURRENT_ITEM,
			payload: {
				id: '1',
				conversation: null,
				messageList: null,
			},
		},
	);

	t.is(state.itemList!.records[0].id, '1');
	t.is(state.itemList!.records[0].id, state.currentItemRef);
});
