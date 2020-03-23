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

ava.serial.beforeEach((test) => {
	test.context.initialState = {
		product: 'jelly-chat-test',
		productTitle: 'Jelly Chat Test',
		cards: {},
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

	test.deepEqual(newState.cards, {
		1: {
			id: 1
		},
		2: {
			id: 2
		}
	})
})

ava('SET_CARDS merges a card that\'s already in the state', (test) => {
	test.context.initialState.cards = {
		1: {
			id: 1,
			links: {
				'is member of': [
					{
						slug: 'org-balena'
					}
				]
			}
		},
		2: {
			id: 2
		}
	}
	const newState = test.context.reducer(test.context.initialState, {
		type: actionTypes.SET_CARDS,
		payload: [
			{
				id: 1,
				links: {
					'has attached element': [
						{
							slug: 'some-card'
						}
					]
				}
			},
			{
				id: 3
			}
		]
	})

	test.deepEqual(newState.cards, {
		1: {
			id: 1,
			links: {
				'is member of': [
					{
						slug: 'org-balena'
					}
				],
				'has attached element': [
					{
						slug: 'some-card'
					}
				]
			}
		},
		3: {
			id: 3
		},
		2: {
			id: 2
		}
	})
})

ava('SET_CURRENT_USER adds the specified card and sets the current user ID', (test) => {
	const newState = test.context.reducer(test.context.initialState, {
		type: actionTypes.SET_CURRENT_USER,
		payload: {
			id: 1,
			foo: 'a'
		}
	})

	test.deepEqual(newState.cards, {
		1: {
			id: 1,
			foo: 'a'
		}
	})
	test.is(newState.currentUser, 1)
})
