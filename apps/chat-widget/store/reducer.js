/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './actionTypes'

const initialState = {
	cards: [],
	currentUser: null
}

const setCard = (stateChain, card) => {
	return stateChain.set(
		[ 'cards' ],
		stateChain.get('cards').unionBy([ card ], 'id').value()
	)
}

export const reducer = (state = initialState, action) => {
	let chain = _.chain(state).cloneDeep()

	switch (action.type) {
		case SET_CARDS:
			for (const card of action.payload) {
				chain = setCard(chain, card)
			}
			break
		case SET_CURRENT_USER:
			chain = setCard(chain, action.payload)
				.set([ 'currentUser' ], action.payload.id)
			break
		default:
			return state
	}

	return chain.value()
}
