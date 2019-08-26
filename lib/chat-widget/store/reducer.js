import _ from 'lodash'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './actionTypes'

const initialState = {
	cards: {
		byId: {},
		byType: {}
	},
	currentUser: null
}

const setCard = (stateChain, card) => {
	return stateChain
		.set([ 'cards', 'byId', card.id ], card)
		.set(
			[ 'cards', 'byType', card.type ],
			stateChain
				.get([ 'cards', 'byType', card.type ], [])
				.union([ card.id ])
				.value()
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
