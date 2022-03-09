import * as actionTypes from './action-types';
import { createReducer } from './reducer';

const context: any = {};

beforeEach(() => {
	context.initialState = {
		product: 'jelly-chat-test',
		productTitle: 'Jelly Chat Test',
		cards: {},
		currentUser: null,
	};
	context.reducer = createReducer(context.initialState);
});

test('SET_CARDS add the specified cards to an empty list', () => {
	const newState = context.reducer(context.initialState, {
		type: actionTypes.SET_CARDS,
		payload: [
			{
				id: 1,
			},
			{
				id: 2,
			},
		],
	});

	expect(newState.cards).toEqual({
		1: {
			id: 1,
		},
		2: {
			id: 2,
		},
	});
});

test("SET_CARDS merges a card that's already in the state", () => {
	context.initialState.cards = {
		1: {
			id: 1,
			links: {
				'is member of': [
					{
						slug: 'org-balena',
					},
				],
			},
		},
		2: {
			id: 2,
		},
	};
	const newState = context.reducer(context.initialState, {
		type: actionTypes.SET_CARDS,
		payload: [
			{
				id: 1,
				links: {
					'has attached element': [
						{
							id: '3',
							slug: 'some-card',
						},
					],
				},
			},
			{
				id: 3,
			},
		],
	});

	expect(newState.cards).toEqual({
		1: {
			id: 1,
			links: {
				'is member of': [
					{
						slug: 'org-balena',
					},
				],
				'has attached element': [
					{
						id: '3',
						slug: 'some-card',
					},
				],
			},
		},
		3: {
			id: 3,
			slug: 'some-card',
		},
		2: {
			id: 2,
		},
	});
});

test('SET_CURRENT_USER adds the specified card and sets the current user ID', () => {
	const newState = context.reducer(context.initialState, {
		type: actionTypes.SET_CURRENT_USER,
		payload: {
			id: 1,
			foo: 'a',
		},
	});

	expect(newState.cards).toEqual({
		1: {
			id: 1,
			foo: 'a',
		},
	});
	expect(newState.currentUser).toBe(1);
});
