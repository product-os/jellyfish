/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')

const actionTypes = require('./action-types')
const {
	createReducer
} = require('./reducer')

ava.beforeEach((test) => {
	test.context.initialState = {
		product: 'jelly-chat-test',
		productTitle: 'Jelly Chat Test',
		cards: [],
		currentUser: null
	}
	test.context.reducer = createReducer(test.context.initialState)
})

ava('SET_CARDS add the specified cards to an empty list', (test) => {
	const newState = test.context.reducer(test.context.initialState, {
		type: actionTypes.SET_CARDS,
		payload: [
			{
				id: 1
			},
			{
				id: 2
			}
		]
	})

	test.deepEqual(newState.cards, [
		{
			id: 1
		},
		{
			id: 2
		}
	])
})

ava('SET_CARDS replaces a card that\'s already in the state', (test) => {
	test.context.initialState.cards = [
		{
			id: 1,
			foo: 'a'
		},
		{
			id: 2
		}
	]
	const newState = test.context.reducer(test.context.initialState, {
		type: actionTypes.SET_CARDS,
		payload: [
			{
				id: 1,
				foo: 'b'
			},
			{
				id: 3
			}
		]
	})

	test.deepEqual(newState.cards, [
		{
			id: 1,
			foo: 'b'
		},
		{
			id: 3
		},
		{
			id: 2
		}
	])
})

ava('SET_CURRENT_USER adds the specified card and sets the current user ID', (test) => {
	const newState = test.context.reducer(test.context.initialState, {
		type: actionTypes.SET_CURRENT_USER,
		payload: {
			id: 1,
			foo: 'a'
		}
	})

	test.deepEqual(newState.cards, [
		{
			id: 1,
			foo: 'a'
		}
	])
	test.is(newState.currentUser, 1)
})
